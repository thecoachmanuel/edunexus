import {
  Users,
  BookOpen,
  Clock,
  GraduationCap,
  CalendarDays,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface StatsProps {
  role: string;
  data: any; // In real app, define a strict interface
}

export function DashboardStats({ role, data }: StatsProps) {
  if (role === "admin") {
    return (
      <>
        <Card className="shadow-sm hover:-translate-y-1 transition-all border-none bg-[#f5f3ff] overflow-hidden group">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-[#7c3aed]/80 uppercase tracking-wider mb-1">Students</p>
                <h3 className="text-3xl font-black text-[#6d28d9]">{data.totalStudents || 0}</h3>
              </div>
              <div className="flex items-center justify-center h-16 w-16 rounded-2xl bg-white shadow-sm text-[#7c3aed] group-hover:scale-110 transition-transform">
                <Users className="h-8 w-8" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm font-semibold text-[#7c3aed]">
              +12 This Week <span className="ml-1 text-lg leading-none">↗</span>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm hover:-translate-y-1 transition-all border-none bg-blue-50 overflow-hidden group">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-blue-600/80 uppercase tracking-wider mb-1">Teachers</p>
                <h3 className="text-3xl font-black text-blue-700">{data.totalTeachers || 0}</h3>
              </div>
              <div className="flex items-center justify-center h-16 w-16 rounded-2xl bg-white shadow-sm text-blue-500 group-hover:scale-110 transition-transform">
                <GraduationCap className="h-8 w-8" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm font-semibold text-blue-600">
              +2 This Week <span className="ml-1 text-lg leading-none">↗</span>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm hover:-translate-y-1 transition-all border-none bg-orange-50 overflow-hidden group">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-orange-600/80 uppercase tracking-wider mb-1">Avg Attendance</p>
                <h3 className="text-3xl font-black text-orange-700">{data.avgAttendance || "0%"}</h3>
              </div>
              <div className="flex items-center justify-center h-16 w-16 rounded-2xl bg-white shadow-sm text-orange-500 group-hover:scale-110 transition-transform">
                <Clock className="h-8 w-8" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm font-semibold text-orange-600">
              +5% This Week <span className="ml-1 text-lg leading-none">↗</span>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm hover:-translate-y-1 transition-all border-none bg-emerald-50 overflow-hidden group">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-emerald-600/80 uppercase tracking-wider mb-1">Active Quizzes</p>
                <h3 className="text-3xl font-black text-emerald-700">{data.activeQuizzes || 0}</h3>
              </div>
              <div className="flex items-center justify-center h-16 w-16 rounded-2xl bg-white shadow-sm text-emerald-500 group-hover:scale-110 transition-transform">
                <BookOpen className="h-8 w-8" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm font-semibold text-emerald-600">
              +8 This Week <span className="ml-1 text-lg leading-none">↗</span>
            </div>
          </CardContent>
        </Card>
      </>
    );
  }

  // --- TEACHER VIEW ---
  if (role === "teacher") {
    return (
      <>
        <Card className="shadow-sm hover:shadow-md transition-shadow border-none">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center h-14 w-14 rounded-2xl bg-indigo-50 text-indigo-500">
                <Users className="h-7 w-7" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">My Classes</p>
                <h3 className="text-3xl font-bold tracking-tight text-foreground">{data.myClassesCount || 0}</h3>
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-green-500 font-medium flex items-center">
                +2 This Week <span className="ml-1 text-lg leading-none">↗</span>
              </span>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm hover:shadow-md transition-shadow border-none">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center h-14 w-14 rounded-2xl bg-orange-50 text-orange-500">
                <AlertCircle className="h-7 w-7" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending Grading</p>
                <h3 className="text-3xl font-bold tracking-tight text-foreground">{data.pendingGrading || 0}</h3>
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-orange-500 font-medium flex items-center">
                Needs Review <span className="ml-1 text-lg leading-none">→</span>
              </span>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm hover:shadow-md transition-shadow border-none">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center h-14 w-14 rounded-2xl bg-blue-50 text-blue-500">
                <CalendarDays className="h-7 w-7" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Classes Today</p>
                <h3 className="text-3xl font-bold tracking-tight text-foreground">{data.classesToday || 0}</h3>
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-blue-500 font-medium flex items-center">
                Schedule <span className="ml-1 text-lg leading-none">→</span>
              </span>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm hover:shadow-md transition-shadow border-none">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center h-14 w-14 rounded-2xl bg-purple-50 text-purple-500">
                <BookOpen className="h-7 w-7" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Class Score</p>
                <h3 className="text-3xl font-bold tracking-tight text-foreground">{data.avgClassScore || "0%"}</h3>
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-green-500 font-medium flex items-center">
                +3% This Term <span className="ml-1 text-lg leading-none">↗</span>
              </span>
            </div>
          </CardContent>
        </Card>
      </>
    );
  }

  // --- STUDENT VIEW ---
  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Attendance</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.myAttendance || "0%"}</div>
          <p className="text-xs text-muted-foreground">This term</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Quizzes</CardTitle>
          <BookOpen className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {data.pendingQuizzes || 0}
          </div>
          <p className="text-xs text-muted-foreground">Due this week</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Next Quiz</CardTitle>
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-xl font-bold truncate">
            {data.nextExam || "None"}
          </div>
          <p className="text-xs text-muted-foreground">
            {data.nextExamDate || "Keep studying!"}
          </p>
        </CardContent>
      </Card>
    </>
  );
}

// also an example
