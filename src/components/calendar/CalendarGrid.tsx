"use client";

import { useState, useMemo, useEffect } from "react";
import useSWR from "swr";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/hooks/AuthProvider";
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  addDays, 
  parseISO 
} from "date-fns";
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon } from "lucide-react";
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

export function CalendarGrid() {
  const { user } = useAuth();
  const { data, mutate, isLoading } = useSWR("/events");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<any[]>([]);
  const [open, setOpen] = useState(false);

  // Form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [type, setType] = useState("Academic");
  const [audience, setAudience] = useState("All");

  useEffect(() => {
    if (data?.events) setEvents(data.events);
  }, [data]);

  const handleCreate = async () => {
    if (!title || !startDate || !endDate) return toast.error("Please fill required fields");
    try {
      await api.post("/events", {
        title,
        description,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        type,
        audience,
      });
      toast.success("Event created");
      setOpen(false);
      setTitle("");
      setDescription("");
      mutate();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to create event");
    }
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDateGrid = startOfWeek(monthStart);
  const endDateGrid = endOfWeek(monthEnd);

  const days = useMemo(() => {
    const d = [];
    let day = startDateGrid;
    while (day <= endDateGrid) {
      d.push(day);
      day = addDays(day, 1);
    }
    return d;
  }, [startDateGrid, endDateGrid]);

  const getEventsForDay = (day: Date) => {
    return events.filter(e => {
      const eStart = parseISO(e.startDate);
      const eEnd = parseISO(e.endDate);
      // Simplify: if day is between start and end date (inclusive of day boundaries)
      return day >= new Date(eStart.setHours(0,0,0,0)) && day <= new Date(eEnd.setHours(23,59,59,999));
    });
  };

  const getTypeColor = (t: string) => {
    if (t === "Holiday") return "bg-green-100 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20";
    if (t === "Exam") return "bg-red-100 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20";
    if (t === "Meeting") return "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20";
    return "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20";
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center bg-white dark:bg-slate-900 rounded-md border dark:border-slate-800 shadow-sm">
            <Button variant="ghost" size="icon" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="font-bold w-32 text-center text-slate-800 dark:text-slate-100">
              {format(currentDate, "MMMM yyyy")}
            </div>
            <Button variant="ghost" size="icon" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="outline" onClick={() => setCurrentDate(new Date())}>Today</Button>
        </div>
        
        {(user?.role === "admin" || user?.role === "teacher") && (
          <Button onClick={() => setOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white">
            <Plus className="mr-2 h-4 w-4" /> Add Event
          </Button>
        )}
      </div>

      <div className="flex-1 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl overflow-x-auto shadow-sm flex flex-col">
        <div className="min-w-[700px] flex-1 flex flex-col">
          <div className="grid grid-cols-7 border-b dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
            <div key={day} className="py-3 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 flex-1 auto-rows-fr">
          {days.map((day, i) => {
            const isToday = isSameDay(day, new Date());
            const isCurrentMonth = isSameMonth(day, monthStart);
            const dayEvents = getEventsForDay(day);

            return (
              <div 
                key={i} 
                className={`min-h-[100px] border-b border-r dark:border-slate-800 p-2 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/80
                  ${!isCurrentMonth ? "bg-slate-50/50 dark:bg-slate-900/50 text-slate-400 dark:text-slate-600" : "bg-white dark:bg-slate-900"}
                  ${i % 7 === 6 ? "border-r-0" : ""}
                `}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full ${isToday ? "bg-indigo-600 text-white" : "text-slate-700 dark:text-slate-300"}`}>
                    {format(day, "d")}
                  </span>
                </div>
                <div className="space-y-1 overflow-y-auto max-h-[80px] no-scrollbar">
                  {dayEvents.map(e => (
                    <div key={e._id} className={`text-xs px-1.5 py-1 rounded border truncate cursor-pointer hover:opacity-80 transition-opacity ${getTypeColor(e.type)}`}>
                      {e.title}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          </div>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Event</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Event Title</label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., Parent-Teacher Meeting" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Start Date</label>
                <Input type="datetime-local" value={startDate} onChange={e => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">End Date</label>
                <Input type="datetime-local" value={endDate} onChange={e => setEndDate(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Type</label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Academic">Academic</SelectItem>
                    <SelectItem value="Holiday">Holiday</SelectItem>
                    <SelectItem value="Exam">Exam</SelectItem>
                    <SelectItem value="Meeting">Meeting</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Audience</label>
                <Select value={audience} onValueChange={setAudience}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All</SelectItem>
                    <SelectItem value="Teachers">Teachers Only</SelectItem>
                    <SelectItem value="Students">Students Only</SelectItem>
                    <SelectItem value="Parents">Parents Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional details..." />
            </div>
            <Button onClick={handleCreate} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white mt-4">Create Event</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
