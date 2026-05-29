"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/AuthProvider";
import useSWR from "swr";
import Link from "next/link";
import { useRouter } from "next/navigation";

// UI Imports
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, FileText, CheckCircle2, ClipboardEdit, FileUp, CalendarCheck } from "lucide-react";

// Custom Components
import { AiInsightWidget } from "@/components/dashboard/ai-insight-widget";
import { DashboardStats } from "@/components/dashboard/dashboard-stats";
import { AttendanceWidget } from "@/components/dashboard/attendance-widget";
import { ClassLeaderboardWidget } from "@/components/dashboard/leaderboard-widget";

export default function Dashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const { data: statsData, isLoading: loading } = useSWR(user ? "/dashboard/stats" : null);

  // Parents have their own portal — redirect them immediately
  useEffect(() => {
    if (user?.role === "parent") {
      router.replace("/parent/portal");
    }
  }, [user, router]);

  // 2. Loading State
  if (loading) {
    return (
      <div className="p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-7">
          <Skeleton className="col-span-4 h-100" />
          <Skeleton className="col-span-3 h-100" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      {/* --- HEADER --- */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 pb-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Welcome Back, {user?.name}</h2>
          <p className="text-muted-foreground mt-1">
            Here's what's happening with your classes today.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Quick Actions (Admin & Teacher) */}
          {(user?.role === "admin" || user?.role === "teacher") && (
            <>
              <Button 
                variant="outline" 
                className="h-auto py-3 px-4 flex flex-col items-center gap-2 border-indigo-100 bg-indigo-50/50 hover:bg-indigo-100 text-indigo-700 hover:text-indigo-800"
                onClick={() => router.push("/lms/quizzes")}
              >
                <ClipboardEdit className="h-5 w-5" />
                <span className="text-xs font-semibold">Create Assignment</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto py-3 px-4 flex flex-col items-center gap-2 border-blue-100 bg-blue-50/50 hover:bg-blue-100 text-blue-700 hover:text-blue-800"
                onClick={() => router.push("/classes/attendance")}
              >
                <CalendarCheck className="h-5 w-5" />
                <span className="text-xs font-semibold">Mark Attendance</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto py-3 px-4 flex flex-col items-center gap-2 border-purple-100 bg-purple-50/50 hover:bg-purple-100 text-purple-700 hover:text-purple-800"
                onClick={() => router.push("/lms/materials")}
              >
                <FileUp className="h-5 w-5" />
                <span className="text-xs font-semibold">Upload Material</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* --- TOP ROW: STATS --- */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <DashboardStats role={user?.role || "student"} data={statsData} />
      </div>

      {/* --- MAIN CONTENT GRID --- */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* LEFT COLUMN (Content) */}
        <div className="col-span-4 space-y-4">
          {/* AI WIDGET */}
          <AiInsightWidget role={user?.role} />

        {/* RECENT ACTIVITY & UPCOMING CLASSES ROW */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2 col-span-7">
          
          {/* RECENT ACTIVITY CARD */}
          <Card className="shadow-sm border-none">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-bold">Recent Activity</CardTitle>
              <Link href="#" className="text-sm font-medium text-indigo-600 hover:text-indigo-800">View All</Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 mt-2">
                {/* Mocked activity to match screenshot style */}
                {[
                  { name: "John Doe", action: "submitted assignment", sub: "UI/UX Design Assignment", status: "Submitted", time: "01:09 am", color: "text-green-600 bg-green-50" },
                  { name: "Flores, Juanita", action: "", sub: "Web Development Assignment", status: "Pending", time: "02:10 pm", color: "text-yellow-600 bg-yellow-50" },
                  { name: "You created a new assignment", action: "", sub: "SEO Assignment", status: "Assignment", time: "08:20 pm", color: "text-indigo-600 bg-indigo-50" },
                  { name: "Miles, Esther", action: "", sub: "Content Creator Assignment", status: "Submitted", time: "01:34 pm", color: "text-green-600 bg-green-50" }
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-slate-200 overflow-hidden shrink-0">
                        {/* Mock Avatar */}
                        <div className="h-full w-full bg-slate-300 flex items-center justify-center text-slate-500 text-xs font-bold">{item.name.charAt(0)}</div>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{item.name} <span className="font-normal text-slate-600">{item.action}</span></p>
                        <p className="text-xs text-slate-500">{item.sub}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-xs font-semibold px-2 py-1 rounded-md inline-block mb-1 ${item.color}`}>
                        ✓ {item.status}
                      </div>
                      <p className="text-xs text-slate-400">{item.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* UPCOMING CLASSES CARD */}
          <Card className="shadow-sm border-none">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-bold">Upcoming Classes</CardTitle>
              <Link href="/timetable" className="text-sm font-medium text-indigo-600 hover:text-indigo-800">View Calendar</Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 mt-2">
                {[
                  { time: "09:30", period: "PM", title: "UI/UX Design", sub: "Class 01", diff: "In 30 min" },
                  { time: "10:15", period: "PM", title: "Front-end Development", sub: "Class 02", diff: "In 45 min" },
                  { time: "11:00", period: "PM", title: "Back-end Development", sub: "Class 03", diff: "In 60 min" },
                  { time: "12:00", period: "PM", title: "Project Management", sub: "Class 04", diff: "In 90 min" }
                ].map((cls, i) => (
                  <div key={i} className="flex items-center justify-between border border-slate-100 rounded-lg p-3 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col items-center justify-center border-l-4 border-indigo-500 bg-indigo-50 px-3 py-1 rounded-r-md min-w-[70px]">
                        <span className="text-sm font-bold text-indigo-900">{cls.time}</span>
                        <span className="text-xs font-semibold text-indigo-600">{cls.period}</span>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">{cls.title}</p>
                        <p className="text-xs text-slate-500">{cls.sub}</p>
                      </div>
                    </div>
                    <div className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-1 rounded-md">
                      {cls.diff}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
          
          {/* ATTENDANCE WIDGET */}
          <AttendanceWidget role={user?.role} />

          {/* CLASS LEADERBOARD WIDGET */}
          <ClassLeaderboardWidget data={statsData?.leaderboard} />
        </div>
      </div>
    </div>
  );
}
