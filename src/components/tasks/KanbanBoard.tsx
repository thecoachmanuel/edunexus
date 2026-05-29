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

type Status = "Todo" | "In Progress" | "Done";
const COLUMNS: Status[] = ["Todo", "In Progress", "Done"];

export function KanbanBoard() {
  const { data, mutate, isLoading } = useSWR("/tasks");
  const [tasks, setTasks] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [draggedTask, setDraggedTask] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [status, setStatus] = useState<Status>("Todo");

  useEffect(() => {
    if (data?.tasks) setTasks(data.tasks);
  }, [data]);

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTask(taskId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e: React.DragEvent, newStatus: Status) => {
    e.preventDefault();
    if (!draggedTask) return;

    // Optimistic Update
    setTasks((prev) =>
      prev.map((t) => (t._id === draggedTask ? { ...t, status: newStatus } : t))
    );
    setDraggedTask(null);

    // Persist
    try {
      await api.put(`/tasks/${draggedTask}`, { status: newStatus });
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

  const getPriorityColor = (p: string) => {
    if (p === "High") return "text-red-500 bg-red-50";
    if (p === "Medium") return "text-yellow-500 bg-yellow-50";
    return "text-green-500 bg-green-50";
  };

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading tasks...</div>;

  return (
    <div className="h-full flex flex-col space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800">Task Board</h2>
          <p className="text-sm text-slate-500">Manage your schedule and tasks</p>
        </div>
        <Button onClick={() => setOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white">
          <Plus className="mr-2 h-4 w-4" /> Add Task
        </Button>
      </div>

      <div className="flex-1 flex gap-4 overflow-x-auto pb-4 h-[70vh] min-h-[500px] snap-x snap-mandatory">
        {COLUMNS.map((col) => (
          <div
            key={col}
            className="flex flex-col w-[85vw] min-w-[280px] sm:min-w-[300px] max-w-[300px] shrink-0 bg-slate-100 rounded-xl p-3 h-full snap-center"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, col)}
          >
            <div className="flex justify-between items-center mb-3 px-1">
              <h3 className="font-semibold text-slate-700">{col}</h3>
              <span className="text-xs font-medium bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">
                {tasks.filter((t) => t.status === col).length}
              </span>
            </div>

            <div className="flex-1 flex flex-col gap-3 overflow-y-auto">
              {tasks
                .filter((t) => t.status === col)
                .map((task) => (
                  <div
                    key={task._id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task._id)}
                    className="bg-white p-3 rounded-lg shadow-sm border border-slate-200 cursor-grab active:cursor-grabbing hover:border-indigo-300 transition-colors group"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </span>
                      <GripVertical className="h-4 w-4 text-slate-300 group-hover:text-slate-400" />
                    </div>
                    <h4 className="font-semibold text-slate-800 text-sm mb-1">{task.title}</h4>
                    {task.description && (
                      <p className="text-xs text-slate-500 line-clamp-2 mb-3">{task.description}</p>
                    )}
                    <div className="flex justify-between items-center text-xs text-slate-400 mt-2">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(task.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
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
            <Button onClick={handleCreate} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white mt-4">Create</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
