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
        <Card className="shadow-sm hover:shadow-md transition-shadow border-none">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center h-14 w-14 rounded-2xl bg-indigo-50 text-indigo-500">
                <Users className="h-7 w-7" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Students</p>
                <h3 className="text-3xl font-bold tracking-tight text-foreground">{data.totalStudents || 0}</h3>
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-green-500 font-medium flex items-center">
                +12 This Week <span className="ml-1 text-lg leading-none">↗</span>
              </span>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm hover:shadow-md transition-shadow border-none">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center h-14 w-14 rounded-2xl bg-blue-50 text-blue-500">
                <GraduationCap className="h-7 w-7" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Teachers</p>
                <h3 className="text-3xl font-bold tracking-tight text-foreground">{data.totalTeachers || 0}</h3>
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
                <Clock className="h-7 w-7" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Attendance</p>
                <h3 className="text-3xl font-bold tracking-tight text-foreground">{data.avgAttendance || "0%"}</h3>
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-green-500 font-medium flex items-center">
                +5% This Week <span className="ml-1 text-lg leading-none">↗</span>
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
                <p className="text-sm font-medium text-muted-foreground">Active Quizzes</p>
                <h3 className="text-3xl font-bold tracking-tight text-foreground">{data.activeQuizzes || 0}</h3>
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-green-500 font-medium flex items-center">
                +8 This Week <span className="ml-1 text-lg leading-none">↗</span>
              </span>
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
