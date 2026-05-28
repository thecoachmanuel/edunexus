"use client";

import { useEffect, useState, useCallback } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import {
  Users,
  Search,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronRight,
  X,
  CalendarDays,
  CheckCircle2,
  XCircle,
  Clock,
  BookOpen,
  Loader2,
  BarChart3,
  UserCheck,
} from "lucide-react";
import { useAuth } from "@/hooks/AuthProvider";
import { api } from "@/lib/api";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Card, CardContent } from "@/components/ui/card";

// ──────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────

interface StudentSummary {
  studentId: string;
  name: string;
  email: string;
  totalDays: number;
  presentDays: number;
  lateDays: number;
  absentDays: number;
  excusedDays: number;
  attendanceRate: number;
}

interface AttendanceDay {
  date: string;
  status: "Present" | "Absent" | "Late" | "Excused";
  remarks: string;
}

interface StudentDetail {
  student: StudentSummary;
  stats: {
    totalDays: number;
    presentDays: number;
    lateDays: number;
    absentDays: number;
    excusedDays: number;
    presentPercentage: number;
  };
  history: AttendanceDay[];
}

// ──────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────

function RateBadge({ rate }: { rate: number }) {
  if (rate >= 80)
    return (
      <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 font-semibold">
        <TrendingUp className="h-3 w-3 mr-1" />
        {rate}%
      </Badge>
    );
  if (rate >= 60)
    return (
      <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 font-semibold">
        <Minus className="h-3 w-3 mr-1" />
        {rate}%
      </Badge>
    );
  return (
    <Badge className="bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 font-semibold">
      <TrendingDown className="h-3 w-3 mr-1" />
      {rate}%
    </Badge>
  );
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "Present":
      return <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />;
    case "Absent":
      return <XCircle className="h-4 w-4 text-red-500 shrink-0" />;
    case "Late":
      return <Clock className="h-4 w-4 text-amber-500 shrink-0" />;
    case "Excused":
      return <BookOpen className="h-4 w-4 text-blue-500 shrink-0" />;
    default:
      return null;
  }
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    Present: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
    Absent: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
    Late: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
    Excused: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
  };
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${map[status] ?? ""}`}>
      {status}
    </span>
  );
}

function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${color}`}
        style={{ width: `${Math.min(value, 100)}%` }}
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon className="h-4 w-4 text-white" />
        </div>
        <div>
          <p className="text-2xl font-bold leading-none">{value}</p>
          <p className="text-xs text-muted-foreground mt-1">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ──────────────────────────────────────────────────────────
// Student Detail Sheet
// ──────────────────────────────────────────────────────────

function StudentDetailSheet({
  open,
  onClose,
  detail,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  detail: StudentDetail | null;
  loading: boolean;
}) {
  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <SheetTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-primary" />
              Student Attendance Detail
            </SheetTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : detail ? (
          <div className="mt-6 space-y-6">
            {/* Student name & rate */}
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold">{detail.student.name}</h2>
                <p className="text-sm text-muted-foreground">{detail.student.email}</p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-primary">
                  {detail.stats.presentPercentage}%
                </div>
                <div className="text-xs text-muted-foreground">Attendance Rate</div>
              </div>
            </div>

            {/* Rate progress */}
            <ProgressBar
              value={detail.stats.presentPercentage}
              color={
                detail.stats.presentPercentage >= 80
                  ? "bg-emerald-500"
                  : detail.stats.presentPercentage >= 60
                  ? "bg-amber-500"
                  : "bg-red-500"
              }
            />

            {/* Stat cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <StatCard
                label="Present"
                value={detail.stats.presentDays}
                icon={CheckCircle2}
                color="bg-emerald-500"
              />
              <StatCard
                label="Absent"
                value={detail.stats.absentDays}
                icon={XCircle}
                color="bg-red-500"
              />
              <StatCard
                label="Late"
                value={detail.stats.lateDays}
                icon={Clock}
                color="bg-amber-500"
              />
              <StatCard
                label="Excused"
                value={detail.stats.excusedDays}
                icon={BookOpen}
                color="bg-blue-500"
              />
            </div>

            {/* Attendance history */}
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-primary" />
                Day-by-Day History ({detail.history.length} days recorded)
              </h3>
              {detail.history.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No attendance records found for this student.
                </p>
              ) : (
                <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                  {detail.history.map((day, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/40 transition-colors"
                    >
                      <StatusIcon status={day.status} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">
                          {format(parseISO(day.date), "EEEE, d MMMM yyyy")}
                        </p>
                        {day.remarks && (
                          <p className="text-xs text-muted-foreground truncate">
                            {day.remarks}
                          </p>
                        )}
                      </div>
                      <StatusPill status={day.status} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

// ──────────────────────────────────────────────────────────
// Main Page
// ──────────────────────────────────────────────────────────

export default function AttendanceTrackingPage() {
  const { user, year } = useAuth();
  const isAdmin = user?.role === "admin";
  const isTeacher = user?.role === "teacher";

  // Local UI state
  const [selectedClassId, setSelectedClassId] = useState("");
  const [overviewSearch, setOverviewSearch] = useState("");
  const [individualSearch, setIndividualSearch] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetDetail, setSheetDetail] = useState<StudentDetail | null>(null);
  const [sheetLoading, setSheetLoading] = useState(false);

  // Class list via SWR
  const { data: classesData } = useSWR(user ? "/classes?limit=1000" : null);
  const allClasses = classesData?.classes || [];
  const classes = isTeacher
    ? allClasses.filter((c: any) => c.classTeacher?._id === user?._id)
    : allClasses;

  // Auto-select first class
  useEffect(() => {
    if (classes.length > 0 && !selectedClassId) {
      setSelectedClassId(classes[0]._id);
    }
  }, [classes.length, selectedClassId]);

  // All students via SWR (for individual-search tab)
  const { data: allStudentsData } = useSWR(user ? "/users?role=student&limit=1000" : null);
  const rawStudents = allStudentsData?.users || [];
  const allStudents = isTeacher && selectedClassId
    ? rawStudents.filter((s: any) => s.studentClass?._id === selectedClassId)
    : rawStudents;

  // Class overview via SWR
  const { data: overviewData, isLoading: loadingOverview } = useSWR(
    selectedClassId && year?._id
      ? `/attendance/session?classId=${selectedClassId}&academicYearId=${year._id}`
      : null
  );
  const students: StudentSummary[] = overviewData?.students || [];

  // ── Open student detail sheet ────────────────────────────
  const openDetail = useCallback(
    async (student: StudentSummary) => {
      setSheetOpen(true);
      setSheetLoading(true);
      setSheetDetail(null);
      try {
        const { data } = await api.get(
          `/attendance/stats?studentId=${student.studentId}&includeHistory=true`
        );
        setSheetDetail({
          student,
          stats: data.stats,
          history: data.history || [],
        });
      } catch {
        toast.error("Failed to load student attendance detail");
        setSheetOpen(false);
      } finally {
        setSheetLoading(false);
      }
    },
    []
  );

  // ── Fetch individual student ─────────────────────────────
  const fetchIndividual = useCallback(
    async (studentId: string) => {
      if (!studentId) return;
      const student = allStudents.find((s: any) => s._id === studentId);
      if (!student) return;
      const summary: StudentSummary = {
        studentId: student._id,
        name: student.name,
        email: student.email,
        totalDays: 0,
        presentDays: 0,
        lateDays: 0,
        absentDays: 0,
        excusedDays: 0,
        attendanceRate: 0,
      };
      await openDetail(summary);
    },
    [allStudents, openDetail]
  );

  // ── Filtered students for overview table ─────────────────
  const filteredStudents = students.filter((s) =>
    s.name.toLowerCase().includes(overviewSearch.toLowerCase())
  );

  // ── Filtered students for individual search ──────────────
  const filteredAllStudents = allStudents.filter((s: any) =>
    s.name.toLowerCase().includes(individualSearch.toLowerCase())
  );

  // ── Summary stats for the class ─────────────────────────
  const classAvgRate =
    students.length > 0
      ? Math.round(
          students.reduce((sum, s) => sum + s.attendanceRate, 0) /
            students.length
        )
      : 0;
  const atRiskCount = students.filter((s) => s.attendanceRate < 60).length;
  const perfectCount = students.filter((s) => s.attendanceRate === 100).length;

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-primary" />
          Attendance Tracking
        </h1>
        <p className="text-muted-foreground">
          Track and analyse student attendance across the full academic session.
        </p>
      </div>

      {/* Class selector */}
      <div className="flex flex-col sm:flex-row gap-4 bg-card p-4 rounded-xl border items-end">
        <div className="w-full sm:w-72">
          <label className="text-xs font-semibold text-muted-foreground mb-1 block">
            Class
          </label>
          <Select value={selectedClassId} onValueChange={setSelectedClassId}>
            <SelectTrigger>
              <SelectValue placeholder="Select Class" />
            </SelectTrigger>
            <SelectContent>
              {classes.map((c) => (
                <SelectItem key={c._id} value={c._id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-full sm:w-64">
          <label className="text-xs font-semibold text-muted-foreground mb-1 block">
            Academic Year
          </label>
          <div className="h-10 px-3 flex items-center rounded-md border bg-muted text-sm text-muted-foreground">
            {year?.name ?? "—"}
          </div>
        </div>
      </div>

      {/* Summary cards (only in class overview) */}
      {students.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                    {students.length}
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-500">
                    Total Students
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/50 dark:to-emerald-900/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-8 w-8 text-emerald-500" />
                <div>
                  <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                    {classAvgRate}%
                  </p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-500">
                    Class Avg Rate
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/50 dark:to-red-900/30 col-span-2 sm:col-span-1">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <TrendingDown className="h-8 w-8 text-red-500" />
                <div>
                  <p className="text-2xl font-bold text-red-700 dark:text-red-400">
                    {atRiskCount}
                  </p>
                  <p className="text-xs text-red-600 dark:text-red-500">
                    At Risk (&lt;60%)
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview" className="gap-2">
            <Users className="h-4 w-4" />
            Class Overview
          </TabsTrigger>
          <TabsTrigger value="individual" className="gap-2">
            <Search className="h-4 w-4" />
            Individual Student
          </TabsTrigger>
        </TabsList>

        {/* ── TAB 1: Class Overview ─────────────────────── */}
        <TabsContent value="overview" className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search students..."
                value={overviewSearch}
                onChange={(e) => setOverviewSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <span className="text-sm text-muted-foreground">
              {filteredStudents.length} student
              {filteredStudents.length !== 1 ? "s" : ""}
            </span>
          </div>

          <div className="rounded-xl border overflow-hidden bg-card shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Student</TableHead>
                  <TableHead className="text-center font-semibold text-emerald-600">
                    Present
                  </TableHead>
                  <TableHead className="text-center font-semibold text-red-600">
                    Absent
                  </TableHead>
                  <TableHead className="text-center font-semibold text-amber-600">
                    Late
                  </TableHead>
                  <TableHead className="text-center font-semibold text-blue-600">
                    Excused
                  </TableHead>
                  <TableHead className="text-center font-semibold">
                    Total Days
                  </TableHead>
                  <TableHead className="text-center font-semibold">
                    Rate
                  </TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingOverview ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                    </TableCell>
                  </TableRow>
                ) : !selectedClassId ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="h-32 text-center text-muted-foreground"
                    >
                      Please select a class to view attendance.
                    </TableCell>
                  </TableRow>
                ) : filteredStudents.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="h-32 text-center text-muted-foreground"
                    >
                      No students found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredStudents.map((student) => (
                    <TableRow
                      key={student.studentId}
                      className="cursor-pointer hover:bg-muted/40 transition-colors group"
                      onClick={() => openDetail(student)}
                    >
                      <TableCell>
                        <div>
                          <p className="font-medium">{student.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {student.email}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-semibold text-emerald-600">
                        {student.presentDays}
                      </TableCell>
                      <TableCell className="text-center font-semibold text-red-600">
                        {student.absentDays}
                      </TableCell>
                      <TableCell className="text-center font-semibold text-amber-600">
                        {student.lateDays}
                      </TableCell>
                      <TableCell className="text-center font-semibold text-blue-600">
                        {student.excusedDays}
                      </TableCell>
                      <TableCell className="text-center text-muted-foreground">
                        {student.totalDays}
                      </TableCell>
                      <TableCell className="text-center">
                        <RateBadge rate={student.attendanceRate} />
                      </TableCell>
                      <TableCell>
                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ── TAB 2: Individual Student ─────────────────── */}
        <TabsContent value="individual" className="space-y-4">
          <div className="bg-card border rounded-xl p-4 space-y-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                Search student by name
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Type a student name..."
                  value={individualSearch}
                  onChange={(e) => setIndividualSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Search results */}
            {individualSearch && filteredAllStudents.length > 0 && (
              <div className="border rounded-lg overflow-hidden divide-y">
                {filteredAllStudents.slice(0, 8).map((s: any) => (
                  <button
                    key={s._id}
                    onClick={() => {
                      setSelectedStudentId(s._id);
                      setIndividualSearch(s.name);
                      fetchIndividual(s._id);
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors flex items-center gap-3"
                  >
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm shrink-0">
                      {s.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{s.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {s.studentClass?.name ?? "No class assigned"} ·{" "}
                        {s.email}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto" />
                  </button>
                ))}
              </div>
            )}

            {individualSearch && filteredAllStudents.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No students match your search.
              </p>
            )}

            {!individualSearch && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Start typing to search for a student.
              </p>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Student Detail Sheet */}
      <StudentDetailSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        detail={sheetDetail}
        loading={sheetLoading}
      />
    </div>
  );
}
