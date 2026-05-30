"use client";

import useSWR from "swr";
import { useAuth } from "@/hooks/AuthProvider";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Users,
  CalendarDays,
  BookOpen,
  Banknote,
  Award,
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  FileText,
  Loader2,
  XCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

// ── Types ────────────────────────────────────────────────────────────────────

interface ChildData {
  _id: string;
  name: string;
  email: string;
  className: string;
  attendance: {
    totalDays: number;
    presentDays: number;
    attendanceRate: number;
  };
  upcomingQuizzes: { _id: string; title: string; dueDate: string }[];
  missingQuizzes?: { _id: string; title: string; dueDate: string }[];
  completedQuizzes?: { _id: string; title: string; score: number }[];
  fees: {
    totalOwed: number;
    totalPaid: number;
    totalBalance: number;
    hasPending: boolean;
    recent: { _id: string; name: string; status: string; balance: number; totalAmount: number; amountPaid: number }[];
  };
  latestReport: {
    term: string;
    averageScore: number;
    overallGrade: string;
    grades: { subject: string; score: number; grade: string }[];
  } | null;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function AttendanceBadge({ rate }: { rate: number }) {
  if (rate >= 80) return <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"><TrendingUp className="h-3 w-3 mr-1" />{rate}%</Badge>;
  if (rate >= 60) return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"><Minus className="h-3 w-3 mr-1" />{rate}%</Badge>;
  return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"><TrendingDown className="h-3 w-3 mr-1" />{rate}%</Badge>;
}

function GradeBadge({ grade }: { grade: string }) {
  const colors: Record<string, string> = {
    A: "bg-emerald-100 text-emerald-700",
    B: "bg-blue-100 text-blue-700",
    C: "bg-amber-100 text-amber-700",
    D: "bg-orange-100 text-orange-700",
    F: "bg-red-100 text-red-700",
  };
  return <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${colors[grade] ?? "bg-muted text-muted-foreground"}`}>{grade}</span>;
}

function FeeStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    paid: "bg-emerald-100 text-emerald-700",
    partial: "bg-amber-100 text-amber-700",
    unpaid: "bg-red-100 text-red-700",
  };
  return <span className={`capitalize text-xs font-semibold px-2 py-0.5 rounded-full ${map[status] ?? "bg-muted"}`}>{status}</span>;
}

// ── Child Card ────────────────────────────────────────────────────────────────

function ChildCard({ child }: { child: ChildData }) {
  const [expanded, setExpanded] = useState(true);
  const initials = child.name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();

  return (
    <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
      {/* Child header */}
      <div className="flex items-center gap-4 p-5 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b">
        <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg shrink-0 shadow">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-lg leading-tight truncate">{child.name}</h2>
          <p className="text-sm text-muted-foreground">{child.className} · {child.email}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {child.fees.hasPending && (
            <span title="Pending fees" className="flex items-center gap-1 text-xs text-amber-600 font-semibold bg-amber-50 border border-amber-200 px-2 py-1 rounded-full">
              <AlertTriangle className="h-3 w-3" /> Pending Fees
            </span>
          )}
          <Button variant="ghost" size="sm" onClick={() => setExpanded((v) => !v)}>
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="p-5 grid gap-5 md:grid-cols-2 xl:grid-cols-4">

          {/* Attendance */}
          <Card className="border shadow-none">
            <CardHeader className="pb-2 flex flex-row items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm font-semibold">Attendance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">{child.attendance.attendanceRate}%</span>
                <AttendanceBadge rate={child.attendance.attendanceRate} />
              </div>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${child.attendance.attendanceRate >= 80 ? "bg-emerald-500" : child.attendance.attendanceRate >= 60 ? "bg-amber-500" : "bg-red-500"}`}
                  style={{ width: `${child.attendance.attendanceRate}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {child.attendance.presentDays} / {child.attendance.totalDays} days present
              </p>
            </CardContent>
          </Card>

          {/* Quizzes Tracker */}
          <Card className="border shadow-none">
            <CardHeader className="pb-2 flex flex-row items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm font-semibold">Quizzes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Missing Quizzes */}
                {child.missingQuizzes && child.missingQuizzes.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-rose-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" /> Missing
                    </h4>
                    <ul className="space-y-2">
                      {child.missingQuizzes.map((q) => (
                        <li key={q._id} className="flex items-start gap-2 text-sm bg-rose-50 dark:bg-rose-950/20 p-2 rounded-md border border-rose-100 dark:border-rose-900/50">
                          <XCircle className="h-3.5 w-3.5 mt-0.5 text-rose-500 shrink-0" />
                          <div className="min-w-0">
                            <p className="font-medium text-rose-700 dark:text-rose-400 truncate">{q.title}</p>
                            <p className="text-xs text-rose-500/80">Past due: {format(new Date(q.dueDate), "MMM d, yyyy")}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Upcoming Quizzes */}
                <div>
                  <h4 className="text-xs font-semibold text-amber-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Upcoming
                  </h4>
                  {child.upcomingQuizzes.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No upcoming quizzes.</p>
                  ) : (
                    <ul className="space-y-2">
                      {child.upcomingQuizzes.map((q) => (
                        <li key={q._id} className="flex items-start gap-2 text-sm">
                          <Clock className="h-3.5 w-3.5 mt-0.5 text-amber-500 shrink-0" />
                          <div className="min-w-0">
                            <p className="font-medium truncate">{q.title}</p>
                            <p className="text-xs text-muted-foreground">Due: {format(new Date(q.dueDate), "MMM d, yyyy")}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Completed Quizzes */}
                {child.completedQuizzes && child.completedQuizzes.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-emerald-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Completed
                    </h4>
                    <ul className="space-y-2">
                      {child.completedQuizzes.map((q) => (
                        <li key={q._id} className="flex items-start justify-between text-sm">
                          <div className="flex items-start gap-2 min-w-0">
                            <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 text-emerald-500 shrink-0" />
                            <p className="font-medium truncate">{q.title}</p>
                          </div>
                          <Badge variant="outline" className="text-xs shrink-0">{q.score} pts</Badge>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Fees */}
          <Card className="border shadow-none">
            <CardHeader className="pb-2 flex flex-row items-center gap-2">
              <Banknote className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm font-semibold">Fees</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-muted/50 rounded-lg p-2">
                  <p className="text-muted-foreground">Total Owed</p>
                  <p className="font-bold text-base">₦{child.fees.totalOwed.toLocaleString()}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-2">
                  <p className="text-muted-foreground">Balance</p>
                  <p className={`font-bold text-base ${child.fees.totalBalance > 0 ? "text-red-500" : "text-emerald-500"}`}>
                    ₦{child.fees.totalBalance.toLocaleString()}
                  </p>
                </div>
              </div>
              {child.fees.recent.slice(0, 2).map((f) => (
                <div key={f._id} className="flex items-center justify-between text-xs pt-1">
                  <span className="truncate text-muted-foreground">{f.name}</span>
                  <FeeStatusBadge status={f.status} />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Latest Report */}
          <Card className="border shadow-none">
            <CardHeader className="pb-2 flex flex-row items-center gap-2">
              <Award className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm font-semibold">Report Card</CardTitle>
            </CardHeader>
            <CardContent>
              {!child.latestReport ? (
                <div className="flex items-center gap-2 text-muted-foreground text-sm py-2">
                  <FileText className="h-4 w-4" />
                  No report card yet
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{child.latestReport.term}</span>
                    <div className="flex items-center gap-2">
                      <GradeBadge grade={child.latestReport.overallGrade} />
                      <span className="text-sm font-bold">{child.latestReport.averageScore}%</span>
                    </div>
                  </div>
                  <ul className="space-y-1 max-h-28 overflow-y-auto">
                    {child.latestReport.grades.map((g, i) => (
                      <li key={i} className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground truncate pr-2">{g.subject}</span>
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="font-medium">{g.score}%</span>
                          <GradeBadge grade={g.grade} />
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ParentPortalPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && user && user.role !== "parent") {
      router.replace("/dashboard");
    }
  }, [user, authLoading, router]);

  const { data, error, isLoading } = useSWR(user?.role === "parent" ? "/parent/portal" : null);
  const children: ChildData[] = data?.children || [];

  if (authLoading || isLoading) {
    return (
      <div className="h-[80vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-[80vh] flex flex-col items-center justify-center text-red-500">
        <AlertTriangle className="h-10 w-10 mb-4" />
        <h2 className="text-xl font-bold">Failed to load portal</h2>
        <p className="text-sm mt-2">{error.message || "An unexpected error occurred."}</p>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6 md:p-8 pt-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
          <Users className="h-7 w-7 text-primary" />
          Parent Portal
        </h1>
        <p className="text-muted-foreground mt-1">
          Track your {children.length === 1 ? "child's" : "children's"} academic progress, attendance, and fees in one place.
        </p>
      </div>

      {children.length === 0 ? (
        <div className="flex flex-col items-center justify-center border rounded-2xl py-20 text-center bg-muted/20">
          <Users className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <h2 className="text-lg font-semibold text-muted-foreground">No children linked</h2>
          <p className="text-sm text-muted-foreground/70 mt-1 max-w-xs">
            Ask your school administrator to link your account to your children's student profiles.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {children.map((child) => (
            <ChildCard key={child._id} child={child} />
          ))}
        </div>
      )}
    </div>
  );
}
