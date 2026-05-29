export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/lib/models/user";
import Class from "@/lib/models/class";
import Exam from "@/lib/models/exam";
import Submission from "@/lib/models/submission";
import ActivityLog from "@/lib/models/activitieslog";
import Attendance from "@/lib/models/attendance";
import ReportCard from "@/lib/models/reportCard";
import { Event } from "@/lib/models/event";
import Timetable from "@/lib/models/timetable";
import jwt from "jsonwebtoken";

const getTodayName = () => new Date().toLocaleDateString("en-US", { weekday: "long" });

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const token = req.cookies.get("jwt")?.value;
    if (!token) return NextResponse.json({ message: "Not authorized" }, { status: 401 });
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { userId: string };
    const user = await User.findById(decoded.userId).lean();
    if (!user) return NextResponse.json({ message: "Not authorized" }, { status: 401 });

    let stats = {};
    const activityQuery = user.role === "admin" ? {} : { user: user._id };
    const recentActivities = await ActivityLog.find(activityQuery)
      .sort({ createdAt: -1 })
      .limit(10)
      .populate("user", "name")
      .lean();

    // --- Calculate Leaderboard Data ---
    // 1. Get all classes
    const classes = await Class.find().select("name").lean();
    
    // 2. Calculate average score per class
    // We can use ReportCard to get the overall average score for each class
    const reportCards = await ReportCard.find().select("class averageScore").lean();
    
    // 3. Calculate attendance per class
    const allAttendanceLogs = await Attendance.find().select("class records").lean();
    
    const leaderboardMap = new Map();
    classes.forEach(c => {
      leaderboardMap.set(c._id.toString(), {
        className: c.name,
        scoreTotal: 0,
        scoreCount: 0,
        attTotal: 0,
        attPresent: 0
      });
    });

    reportCards.forEach((rc: any) => {
      if (!rc.class) return;
      const cId = rc.class.toString();
      if (leaderboardMap.has(cId)) {
        leaderboardMap.get(cId).scoreTotal += rc.averageScore;
        leaderboardMap.get(cId).scoreCount += 1;
      }
    });

    allAttendanceLogs.forEach(log => {
      if (!log.class) return;
      const cId = log.class.toString();
      if (leaderboardMap.has(cId)) {
        const stats = leaderboardMap.get(cId);
        log.records.forEach((rec: any) => {
          stats.attTotal += 1;
          if (rec.status === "Present" || rec.status === "Late") {
            stats.attPresent += 1;
          }
        });
      }
    });

    const leaderboard = Array.from(leaderboardMap.values()).map(item => ({
      className: item.className,
      averageScore: item.scoreCount > 0 ? Math.round(item.scoreTotal / item.scoreCount) : 0,
      attendanceRate: item.attTotal > 0 ? Math.round((item.attPresent / item.attTotal) * 100) : 0,
      totalScore: (item.scoreCount > 0 ? Math.round(item.scoreTotal / item.scoreCount) : 0) + (item.attTotal > 0 ? Math.round((item.attPresent / item.attTotal) * 100) : 0)
    })).sort((a, b) => b.totalScore - a.totalScore).slice(0, 5); // Top 5
    // ----------------------------------

    const formattedActivity = recentActivities.map((log) => {
      let color = "text-indigo-600 bg-indigo-50";
      let status = "System";
      if (log.action.includes("created")) { color = "text-blue-600 bg-blue-50"; status = "Created"; }
      else if (log.action.includes("updated") || log.action.includes("submitted")) { color = "text-green-600 bg-green-50"; status = "Updated"; }
      else if (log.action.includes("deleted")) { color = "text-red-600 bg-red-50"; status = "Deleted"; }

      return {
        name: (log.user as any)?.name || "System",
        action: log.action,
        sub: "",
        status,
        time: new Date(log.createdAt as any).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        color
      };
    });

    if (formattedActivity.length === 0) {
      formattedActivity.push(
        { name: "System", action: "System initialized", sub: "Setup", status: "Created", time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), color: "text-blue-600 bg-blue-50" },
        { name: "Admin", action: "Logged into dashboard", sub: "Auth", status: "Activity", time: "08:30 AM", color: "text-indigo-600 bg-indigo-50" }
      );
    }

    const upcomingEvents = await Event.find({ startDate: { $gte: new Date() } })
      .sort({ startDate: 1 })
      .limit(4)
      .lean();

    const upcomingClasses = upcomingEvents.map((evt: any) => {
      const d = new Date(evt.startDate);
      return {
        time: d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }).split(" ")[0],
        period: d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }).split(" ")[1] || "AM",
        title: evt.title,
        sub: evt.type,
        diff: new Date(evt.startDate).toLocaleDateString()
      };
    });

    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - 7);

    if (user.role === "admin") {
      const totalStudents = await User.countDocuments({ role: "student" });
      const newStudentsThisWeek = await User.countDocuments({ role: "student", createdAt: { $gte: startOfWeek } });

      const totalTeachers = await User.countDocuments({ role: "teacher" });
      const newTeachersThisWeek = await User.countDocuments({ role: "teacher", createdAt: { $gte: startOfWeek } });

      const activeQuizzes = await Exam.countDocuments({ isActive: true });
      const newQuizzesThisWeek = await Exam.countDocuments({ isActive: true, createdAt: { $gte: startOfWeek } });
      
      const allAttendance = await Attendance.find({}).lean();
      let totalRecords = 0;
      let presentRecords = 0;
      let weekTotal = 0;
      let weekPresent = 0;
      
      allAttendance.forEach((att) => {
        const isThisWeek = new Date(att.date) >= startOfWeek;
        att.records.forEach((rec: any) => {
          totalRecords++;
          if (rec.status === "Present" || rec.status === "Late") presentRecords++;
          if (isThisWeek) {
            weekTotal++;
            if (rec.status === "Present" || rec.status === "Late") weekPresent++;
          }
        });
      });
      const overallAvg = totalRecords === 0 ? 100 : Math.round((presentRecords / totalRecords) * 100);
      const weekAvg = weekTotal === 0 ? overallAvg : Math.round((weekPresent / weekTotal) * 100);
      const attDiff = weekAvg - overallAvg;
      
      const avgAttendance = `${overallAvg}%`;

      stats = { 
        totalStudents, newStudentsThisWeek,
        totalTeachers, newTeachersThisWeek,
        activeQuizzes, newQuizzesThisWeek,
        avgAttendance, attDiff,
        recentActivity: formattedActivity, upcomingClasses, leaderboard 
      };
    } else if (user.role === "teacher") {
      const myClassesCount = await Class.countDocuments({ classTeacher: user._id });
      const newClassesThisWeek = await Class.countDocuments({ classTeacher: user._id, createdAt: { $gte: startOfWeek } });
      const myExams = await Exam.find({ teacher: user._id }).select("_id").lean();
      const myExamIds = myExams.map((exam) => exam._id);
      const pendingGrading = await Submission.countDocuments({ exam: { $in: myExamIds }, score: 0 });
      
      const currentDay = new Date().toLocaleDateString("en-US", { weekday: "long" });
      const timetables = await Timetable.find({ "schedule.periods.teacher": user._id })
        .populate("class", "name")
        .lean();
        
      let nextClass = "No upcoming classes";
      let nextClassTime = "";
      let classesToday = 0;
      
      for (const tt of timetables) {
        const todaySchedule = (tt as any).schedule?.find((s: any) => s.day === currentDay);
        if (todaySchedule) {
          const myPeriods = todaySchedule.periods
            .filter((p: any) => p.teacher?.toString() === user._id.toString())
            .sort((a: any, b: any) => a.startTime.localeCompare(b.startTime));
            
          classesToday += myPeriods.length;
          
          if (myPeriods.length > 0 && nextClassTime === "") {
            nextClass = `${(tt.class as any)?.name || "Class"}`;
            nextClassTime = myPeriods[0].startTime;
          }
        }
      }

      stats = { 
        myClassesCount, newClassesThisWeek,
        pendingGrading, classesToday, nextClass, nextClassTime, 
        recentActivity: formattedActivity, upcomingClasses, leaderboard 
      };
    } else if (user.role === "student") {
      const nextExam = await Exam.findOne({ class: user.studentClass, dueDate: { $gte: new Date() } }).sort({ dueDate: 1 }).lean();
      const pendingQuizzes = await Exam.countDocuments({ class: user.studentClass, isActive: true, dueDate: { $gte: new Date() } });

      const studentAttendance = await Attendance.find({ "records.student": user._id }).lean();
      let totalMyRecords = 0;
      let myPresentRecords = 0;
      studentAttendance.forEach((att: any) => {
        const rec = att.records.find((r: any) => r.student.toString() === user._id.toString());
        if (rec) {
          totalMyRecords++;
          if (rec.status === "Present" || rec.status === "Late") myPresentRecords++;
        }
      });
      const myAttendance = totalMyRecords === 0 ? "100%" : `${Math.round((myPresentRecords / totalMyRecords) * 100)}%`;

      stats = { myAttendance, pendingQuizzes, nextExam: nextExam?.title || "No upcoming exams", nextExamDate: nextExam ? new Date(nextExam.dueDate).toLocaleDateString() : "", recentActivity: formattedActivity, upcomingClasses, leaderboard };
    }
    return NextResponse.json(stats);
  } catch (error) {
    return NextResponse.json({ message: "Server Error", error }, { status: 500 });
  }
}
