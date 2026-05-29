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
import { EarlyWarningWidget } from "@/components/dashboard/early-warning-widget";

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
            {user?.role === "admin" 
              ? "Here is an overview of the entire school's activity today." 
              : "Here's what's happening with your classes today."}
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
                onClick={() => router.push("/academics/attendance")}
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
      <div className="grid gap-6 md:grid-cols-12">
        {/* LEFT COLUMN (Content) */}
        <div className="col-span-12 lg:col-span-8 space-y-4">
          {/* AI WIDGET */}
          <AiInsightWidget role={user?.role} />

          {/* EARLY WARNING SYSTEM (Admin & Teacher) */}
          {(user?.role === "admin" || user?.role === "teacher") && (
            <EarlyWarningWidget />
          )}

          {/* RECENT ACTIVITY & UPCOMING CLASSES ROW */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* RECENT ACTIVITY CARD */}
            {user?.role === "admin" && (
              <Card className="shadow-sm border-none">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-lg font-bold">Recent Activity</CardTitle>
                  <Link href="#" className="text-sm font-medium text-indigo-600 hover:text-indigo-800">View All</Link>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 mt-2 max-h-[300px] overflow-y-auto no-scrollbar">
                    {statsData?.recentActivity?.length > 0 ? (
                      statsData.recentActivity.map((item: any, i: number) => (
                        <div key={i} className="flex items-center justify-between py-2 border-b last:border-0 pb-3">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-muted overflow-hidden shrink-0">
                              <div className="h-full w-full bg-slate-300 dark:bg-muted flex items-center justify-center text-slate-500 dark:text-muted-foreground text-xs font-bold">
                                {item.name.charAt(0)}
                              </div>
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-slate-800 dark:text-foreground">{item.name} <span className="font-normal text-slate-600 dark:text-muted-foreground">{item.action}</span></p>
                              {item.sub && <p className="text-xs text-slate-500 dark:text-muted-foreground">{item.sub}</p>}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`text-[10px] font-semibold px-2 py-0.5 rounded-md inline-block mb-1 ${item.color || "bg-gray-100 text-gray-600 dark:bg-muted dark:text-muted-foreground"}`}>
                              ✓ {item.status || "Activity"}
                            </div>
                            <p className="text-xs text-slate-400 dark:text-muted-foreground block">{item.time}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-slate-500">No recent activity found.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* UPCOMING CLASSES CARD */}
            <Card className="shadow-sm border-none">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-bold">Upcoming Events</CardTitle>
                <Link href="/calendar" className="text-sm font-medium text-indigo-600 hover:text-indigo-800">View Calendar</Link>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 mt-2">
                  {statsData?.upcomingClasses?.length > 0 ? (
                    statsData.upcomingClasses.map((cls: any, i: number) => (
                      <div key={i} className="flex items-center justify-between border border-slate-100 dark:border-border rounded-lg p-3 hover:bg-slate-50 dark:hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="flex flex-col items-center justify-center border-l-4 border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 px-3 py-1 rounded-r-md min-w-[70px]">
                            <span className="text-sm font-bold text-indigo-900 dark:text-indigo-200">{cls.time}</span>
                            <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">{cls.period}</span>
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-800 dark:text-foreground">{cls.title}</p>
                            <p className="text-xs text-slate-500 dark:text-muted-foreground">{cls.sub}</p>
                          </div>
                        </div>
                        <div className="text-xs font-medium text-slate-400 dark:text-muted-foreground bg-slate-100 dark:bg-muted px-2 py-1 rounded-md">
                          {cls.diff}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">No upcoming events scheduled.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* RIGHT COLUMN (Schedule/Quick Links) */}
        <div className="col-span-12 lg:col-span-4 space-y-4">
          <AttendanceWidget role={user?.role} />

          {/* CLASS LEADERBOARD WIDGET */}
          <ClassLeaderboardWidget data={statsData?.leaderboard} />
        </div>
      </div>
    </div>
  );
}
