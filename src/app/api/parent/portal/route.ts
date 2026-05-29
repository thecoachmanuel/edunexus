import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/lib/models/user";
import Attendance from "@/lib/models/attendance";
import Exam from "@/lib/models/exam";
import StudentFee from "@/lib/models/studentFee";
import ReportCard from "@/lib/models/reportCard";
import Class from "@/lib/models/class";
import Subject from "@/lib/models/subject";
import FeeStructure from "@/lib/models/feeStructure";
import AcademicYear from "@/lib/models/academicYear";
import jwt from "jsonwebtoken";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const token = req.cookies.get("jwt")?.value;
    if (!token) return NextResponse.json({ message: "Not authorized" }, { status: 401 });
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { userId: string };

    const parent = await User.findById(decoded.userId).populate("children");
    if (!parent || parent.role !== "parent") {
      return NextResponse.json({ message: "Not authorized" }, { status: 403 });
    }

    const childrenIds = (parent.children || [])
      .filter((c: any) => c != null)
      .map((c: any) => c._id);

    // Get full children profiles
    const children = await User.find({ _id: { $in: childrenIds } })
      .select("name email studentClass")
      .populate("studentClass", "name")
      .lean();

    // Build per-child data
    const childrenData = await Promise.all(
      children.map(async (child: any) => {
        // 1. Attendance summary
        const attendances = await Attendance.find({ "records.student": child._id }).lean();
        let totalDays = 0, presentDays = 0;
        attendances.forEach((a: any) => {
          const rec = a.records.find((r: any) => r.student.toString() === child._id.toString());
          if (rec) {
            totalDays++;
            if (rec.status === "Present" || rec.status === "Late") presentDays++;
          }
        });
        const attendanceRate = totalDays === 0 ? 100 : Math.round((presentDays / totalDays) * 100);

        // 2. Upcoming quizzes
        const upcomingQuizzes = await Exam.find({
          class: child.studentClass?._id,
          isActive: true,
          dueDate: { $gte: new Date() },
        })
          .sort({ dueDate: 1 })
          .limit(3)
          .select("title dueDate")
          .lean();

        // 3. Fee summary
        const fees = await StudentFee.find({ student: child._id })
          .populate("feeStructure", "name dueDate")
          .sort({ createdAt: -1 })
          .limit(5)
          .lean();

        const totalOwed = fees.reduce((s: number, f: any) => s + (f.totalAmount || 0), 0);
        const totalPaid = fees.reduce((s: number, f: any) => s + (f.amountPaid || 0), 0);
        const totalBalance = fees.reduce((s: number, f: any) => s + (f.balance || 0), 0);
        const hasPending = fees.some((f: any) => f.status !== "paid");

        // 4. Latest report card
        const latestReport = await ReportCard.findOne({ student: child._id })
          .sort({ createdAt: -1 })
          .populate("grades.subject", "name")
          .lean();

        return {
          _id: child._id.toString(),
          name: child.name,
          email: child.email,
          className: child.studentClass?.name || "No Class",
          attendance: { totalDays, presentDays, attendanceRate },
          upcomingQuizzes: upcomingQuizzes.map((q: any) => ({
            _id: q._id.toString(),
            title: q.title,
            dueDate: q.dueDate,
          })),
          fees: {
            totalOwed,
            totalPaid,
            totalBalance,
            hasPending,
            recent: fees.map((f: any) => ({
              _id: f._id.toString(),
              name: f.feeStructure?.name || "Fee",
              status: f.status,
              balance: f.balance,
              totalAmount: f.totalAmount,
              amountPaid: f.amountPaid,
            })),
          },
          latestReport: latestReport
            ? {
                term: (latestReport as any).term,
                averageScore: (latestReport as any).averageScore,
                overallGrade: (latestReport as any).overallGrade,
                grades: ((latestReport as any).grades || []).map((g: any) => ({
                  subject: g.subject?.name || "Subject",
                  score: g.score,
                  grade: g.grade,
                })),
              }
            : null,
        };
      })
    );

    return NextResponse.json({ children: childrenData });
  } catch (error) {
    console.error("Parent Portal Error:", error);
    return NextResponse.json({ message: "Server Error" }, { status: 500 });
  }
}
