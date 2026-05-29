"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Plus, GripVertical, Calendar, Clock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, TouchSensor, useSensor, useSensors, MouseSensor } from '@dnd-kit/core';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

type Status = "Todo" | "In Progress" | "Done";
const COLUMNS: Status[] = ["Todo", "In Progress", "Done"];

const getPriorityColor = (p: string) => {
  if (p === "High") return "text-red-500 bg-red-50 dark:bg-red-500/10 dark:text-red-400";
  if (p === "Medium") return "text-yellow-500 bg-yellow-50 dark:bg-yellow-500/10 dark:text-yellow-400";
  return "text-green-500 bg-green-50 dark:bg-green-500/10 dark:text-green-400";
};

// --- DRAGGABLE TASK COMPONENT ---
function TaskCard({ task, isDragging }: { task: any, isDragging?: boolean }) {
  return (
    <div className={`bg-white dark:bg-slate-900 p-3 rounded-lg shadow-sm border ${isDragging ? 'border-indigo-500 opacity-50' : 'border-slate-200 dark:border-slate-700'} cursor-grab active:cursor-grabbing hover:border-indigo-300 dark:hover:border-indigo-500 transition-colors group`}>
      <div className="flex justify-between items-start mb-2">
        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${getPriorityColor(task.priority)}`}>
          {task.priority}
        </span>
        <GripVertical className="h-4 w-4 text-slate-300 dark:text-slate-600 group-hover:text-slate-400 dark:group-hover:text-slate-400 focus:outline-none" />
      </div>
      <h4 className="font-semibold text-slate-800 dark:text-slate-100 text-sm mb-1">{task.title}</h4>
      {task.description && (
        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-3">{task.description}</p>
      )}
      <div className="flex justify-between items-center text-xs text-slate-400 dark:text-slate-500 mt-2">
        <span className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {new Date(task.createdAt).toLocaleDateString()}
        </span>
      </div>
    </div>
  );
}

function SortableTask({ task }: { task: any }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task._id,
    data: {
      type: "Task",
      task,
    }
  });

  const style = {
    transform: CSS.Translate.toString(transform),
  };

  return (
    // 'touch-none' prevents scrolling when starting a drag on this specific element
    <div ref={setNodeRef} style={style} {...listeners} {...attributes} className="touch-none">
      <TaskCard task={task} isDragging={isDragging} />
    </div>
  );
}

// --- DROPPABLE COLUMN COMPONENT ---
function Column({ col, tasks }: { col: Status, tasks: any[] }) {
  const { setNodeRef, isOver } = useDroppable({
    id: col,
    data: {
      type: "Column",
      status: col,
    }
  });

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col w-[85vw] sm:w-[320px] shrink-0 bg-slate-100/80 dark:bg-slate-800/50 rounded-xl p-3 h-full snap-center transition-colors ${isOver ? 'bg-indigo-50/50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/30 border-2 border-dashed' : 'border-2 border-transparent'}`}
    >
      <div className="flex justify-between items-center mb-3 px-1">
        <h3 className="font-semibold text-slate-700 dark:text-slate-200">{col}</h3>
        <span className="text-xs font-medium bg-white dark:bg-slate-700 shadow-sm text-slate-600 dark:text-slate-300 px-2.5 py-0.5 rounded-full">
          {tasks.length}
        </span>
      </div>

      <div className="flex-1 flex flex-col gap-3 overflow-y-auto pb-2">
        {tasks.map((task) => (
          <SortableTask key={task._id} task={task} />
        ))}
      </div>
    </div>
  );
}

export function KanbanBoard() {
  const { data, mutate, isLoading } = useSWR("/tasks");
  const [tasks, setTasks] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [activeTask, setActiveTask] = useState<any | null>(null);

  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [status, setStatus] = useState<Status>("Todo");

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    })
  );

  useEffect(() => {
    if (data?.tasks) setTasks(data.tasks);
  }, [data]);

  const handleDragStart = (e: DragStartEvent) => {
    const { active } = e;
    if (active.data.current?.type === "Task") {
      setActiveTask(active.data.current.task);
    }
  };

  const handleDragEnd = async (e: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = e;

    if (!over) return;

    const taskId = active.id as string;
    const newStatus = over.id as Status;
    const task = tasks.find(t => t._id === taskId);

    if (!task || task.status === newStatus) return;

    // Optimistic Update
    setTasks((prev) =>
      prev.map((t) => (t._id === taskId ? { ...t, status: newStatus } : t))
    );

    // Persist
    try {
      await api.put(`/tasks/${taskId}`, { status: newStatus });
      mutate();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update task");
      mutate(); // Revert
    }
  };

  const handleCreate = async () => {
    if (!title) return toast.error("Title is required");
    try {
      await api.post("/tasks", { title, description, priority, status });
      toast.success("Task created");
      setOpen(false);
      setTitle("");
      setDescription("");
      mutate();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to create task");
    }
  };

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading tasks...</div>;

  return (
    <div className="h-full flex flex-col space-y-4">
      <div className="flex justify-between items-center px-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100">Task Board</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Manage your schedule and tasks</p>
        </div>
        <Button onClick={() => setOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white shadow-sm">
          <Plus className="mr-2 h-4 w-4" /> Add Task
        </Button>
      </div>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        {/* We use full width on mobile, and standard width on larger screens. Snap allows native feeling horizontal scroll on mobile */}
        <div className="flex-1 flex gap-4 overflow-x-auto pb-4 h-[75vh] min-h-[500px] snap-x snap-mandatory px-2">
          {COLUMNS.map((col) => (
            <Column key={col} col={col} tasks={tasks.filter((t) => t.status === col)} />
          ))}
        </div>

        <DragOverlay>
          {activeTask ? <TaskCard task={activeTask} isDragging /> : null}
        </DragOverlay>
      </DndContext>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Title</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Grade Midterms" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional details..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Priority</label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={status} onValueChange={(v) => setStatus(v as Status)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COLUMNS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={handleCreate} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white mt-4 shadow-sm">Create Task</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
