import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/lib/models/user";
import Class from "@/lib/models/class";
import Exam from "@/lib/models/exam";
import Submission from "@/lib/models/submission";
import ActivityLog from "@/lib/models/activitieslog";
import Attendance from "@/lib/models/attendance";
import ReportCard from "@/lib/models/reportCard";
import jwt from "jsonwebtoken";

const getTodayName = () => new Date().toLocaleDateString("en-US", { weekday: "long" });

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const token = req.cookies.get("jwt")?.value;
    if (!token) return NextResponse.json({ message: "Not authorized" }, { status: 401 });
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { userId: string };
    const user = await User.findById(decoded.userId);
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

    const formattedActivity = recentActivities.map(
      (log) =>
        `${(log.user as any)?.name || "System"}: ${log.action} (${new Date(
          log.createdAt as any
        ).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })})`
    );

    if (user.role === "admin") {
      const totalStudents = await User.countDocuments({ role: "student" });
      const totalTeachers = await User.countDocuments({ role: "teacher" });
      const activeExams = await Exam.countDocuments({ isActive: true });
      
      const allAttendance = await Attendance.find({}).lean();
      let totalRecords = 0;
      let presentRecords = 0;
      allAttendance.forEach((att) => {
        att.records.forEach((rec: any) => {
          totalRecords++;
          if (rec.status === "Present" || rec.status === "Late") presentRecords++;
        });
      });
      const avgAttendance = totalRecords === 0 ? "100%" : `${Math.round((presentRecords / totalRecords) * 100)}%`;

      stats = { totalStudents, totalTeachers, activeExams, avgAttendance, recentActivity: formattedActivity, leaderboard };
    } else if (user.role === "teacher") {
      const myClassesCount = await Class.countDocuments({ classTeacher: user._id });
      const myExams = await Exam.find({ teacher: user._id }).select("_id").lean();
      const myExamIds = myExams.map((exam) => exam._id);
      const pendingGrading = await Submission.countDocuments({ exam: { $in: myExamIds }, score: 0 });
      stats = { myClassesCount, pendingGrading, nextClass: "Mathematics - Grade 10", nextClassTime: "10:00 AM", recentActivity: formattedActivity, leaderboard };
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

      stats = { myAttendance, pendingQuizzes, nextExam: nextExam?.title || "No upcoming exams", nextExamDate: nextExam ? new Date(nextExam.dueDate).toLocaleDateString() : "", recentActivity: formattedActivity, leaderboard };
    }
    return NextResponse.json(stats);
  } catch (error) {
    return NextResponse.json({ message: "Server Error", error }, { status: 500 });
  }
}
