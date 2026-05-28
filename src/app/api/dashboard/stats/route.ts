import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/lib/models/user";
import Class from "@/lib/models/class";
import Exam from "@/lib/models/exam";
import Submission from "@/lib/models/submission";
import ActivityLog from "@/lib/models/activitieslog";
import Attendance from "@/lib/models/attendance";
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
      .populate("user", "name");

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
      
      const allAttendance = await Attendance.find({});
      let totalRecords = 0;
      let presentRecords = 0;
      allAttendance.forEach((att) => {
        att.records.forEach((rec: any) => {
          totalRecords++;
          if (rec.status === "Present" || rec.status === "Late") presentRecords++;
        });
      });
      const avgAttendance = totalRecords === 0 ? "100%" : `${Math.round((presentRecords / totalRecords) * 100)}%`;

      stats = { totalStudents, totalTeachers, activeExams, avgAttendance, recentActivity: formattedActivity };
    } else if (user.role === "teacher") {
      const myClassesCount = await Class.countDocuments({ classTeacher: user._id });
      const myExams = await Exam.find({ teacher: user._id }).select("_id");
      const myExamIds = myExams.map((exam) => exam._id);
      const pendingGrading = await Submission.countDocuments({ exam: { $in: myExamIds }, score: 0 });
      stats = { myClassesCount, pendingGrading, nextClass: "Mathematics - Grade 10", nextClassTime: "10:00 AM", recentActivity: formattedActivity };
    } else if (user.role === "student") {
      const nextExam = await Exam.findOne({ class: user.studentClass, dueDate: { $gte: new Date() } }).sort({ dueDate: 1 });
      const pendingAssignments = await Exam.countDocuments({ class: user.studentClass, isActive: true, dueDate: { $gte: new Date() } });

      const studentAttendance = await Attendance.find({ "records.student": user._id });
      let totalMyRecords = 0;
      let myPresentRecords = 0;
      studentAttendance.forEach((att) => {
        const rec = att.records.find((r: any) => r.student.toString() === user._id.toString());
        if (rec) {
          totalMyRecords++;
          if (rec.status === "Present" || rec.status === "Late") myPresentRecords++;
        }
      });
      const myAttendance = totalMyRecords === 0 ? "100%" : `${Math.round((myPresentRecords / totalMyRecords) * 100)}%`;

      stats = { myAttendance, pendingAssignments, nextExam: nextExam?.title || "No upcoming exams", nextExamDate: nextExam ? new Date(nextExam.dueDate).toLocaleDateString() : "", recentActivity: formattedActivity };
    }
    return NextResponse.json(stats);
  } catch (error) {
    return NextResponse.json({ message: "Server Error", error }, { status: 500 });
  }
}
