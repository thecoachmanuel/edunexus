export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/lib/models/user";
import Class from "@/lib/models/class";
import Attendance from "@/lib/models/attendance";
import ReportCard from "@/lib/models/reportCard";
import Exam from "@/lib/models/exam";
import Submission from "@/lib/models/submission";
import { getAuthUser } from "@/middleware/auth";

interface RiskFactor {
  label: string;
  severity: "high" | "medium";
  points: number;
}

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const authUser = await getAuthUser(req, ["admin"]);
    if (!authUser) {
      return NextResponse.json({ message: "Not authorized" }, { status: 401 });
    }

    // Determine scope: admin sees all students
    let studentQuery: any = { role: "student" };
    if (authUser.role === "teacher") {
      const myClasses = await Class.find({ classTeacher: authUser._id }).select("_id students").lean();
      const studentIds = myClasses.flatMap((c: any) => c.students || []);
      if (studentIds.length === 0) {
        return NextResponse.json({ students: [], summary: { highRisk: 0, atRisk: 0, stable: 0, total: 0 } });
      }
      studentQuery = { _id: { $in: studentIds }, role: "student" };
    }

    const students = await User.find(studentQuery)
      .select("_id name email studentClass")
      .populate("studentClass", "name")
      .lean() as any[];

    if (students.length === 0) {
      return NextResponse.json({ students: [], summary: { highRisk: 0, atRisk: 0, stable: 0, total: 0 } });
    }

    // Pre-fetch all relevant data in bulk for efficiency
    const studentIds = students.map((s: any) => s._id);
    const fourWeeksAgo = new Date();
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

    // Bulk fetch attendance (last 4 weeks)
    const recentAttendance = await Attendance.find({
      "records.student": { $in: studentIds },
      date: { $gte: fourWeeksAgo },
    }).lean() as any[];

    // Bulk fetch ALL report cards for these students (to check grade trends)
    const allReportCards = await ReportCard.find({
      student: { $in: studentIds },
    }).sort({ createdAt: -1 }).lean() as any[];

    // Bulk fetch all exams and submissions
    const allExams = await Exam.find({ isActive: false }).select("_id class").lean() as any[];
    const allExamIds = allExams.map((e: any) => e._id);
    const allSubmissions = await Submission.find({
      student: { $in: studentIds },
      exam: { $in: allExamIds },
    }).select("student exam score").lean() as any[];

    // Build lookup maps
    const attendanceByStudent = new Map<string, { total: number; present: number }>();
    recentAttendance.forEach((att: any) => {
      att.records.forEach((rec: any) => {
        const sid = rec.student.toString();
        if (!studentIds.some((id: any) => id.toString() === sid)) return;
        if (!attendanceByStudent.has(sid)) attendanceByStudent.set(sid, { total: 0, present: 0 });
        const entry = attendanceByStudent.get(sid)!;
        entry.total++;
        if (rec.status === "Present" || rec.status === "Late") entry.present++;
      });
    });

    const reportCardsByStudent = new Map<string, any[]>();
    allReportCards.forEach((rc: any) => {
      const sid = rc.student.toString();
      if (!reportCardsByStudent.has(sid)) reportCardsByStudent.set(sid, []);
      reportCardsByStudent.get(sid)!.push(rc);
    });

    const submissionsByStudent = new Map<string, any[]>();
    allSubmissions.forEach((sub: any) => {
      const sid = sub.student.toString();
      if (!submissionsByStudent.has(sid)) submissionsByStudent.set(sid, []);
      submissionsByStudent.get(sid)!.push(sub);
    });

    const examsForClass = new Map<string, string[]>();
    allExams.forEach((e: any) => {
      if (!e.class) return;
      const cid = e.class.toString();
      if (!examsForClass.has(cid)) examsForClass.set(cid, []);
      examsForClass.get(cid)!.push(e._id.toString());
    });

    // Compute risk score for each student
    const results = students.map((student: any) => {
      const sid = student._id.toString();
      const riskFactors: RiskFactor[] = [];
      let riskScore = 0;

      // 1. Attendance check (last 4 weeks)
      const att = attendanceByStudent.get(sid) || { total: 0, present: 0 };
      const attRate = att.total === 0 ? 100 : Math.round((att.present / att.total) * 100);
      if (attRate < 60) {
        const f = { label: `Attendance critically low: ${attRate}% in last 4 weeks`, severity: "high" as const, points: 3 };
        riskFactors.push(f);
        riskScore += f.points;
      } else if (attRate < 75) {
        const f = { label: `Attendance below 75%: ${attRate}% in last 4 weeks`, severity: "medium" as const, points: 2 };
        riskFactors.push(f);
        riskScore += f.points;
      }

      // 2. Grade trend — compare last two terms
      const cards = reportCardsByStudent.get(sid) || [];
      if (cards.length >= 2) {
        const latestScore = cards[0].averageScore ?? 0;
        const previousScore = cards[1].averageScore ?? 0;
        const drop = previousScore - latestScore;
        if (drop >= 15) {
          const f = { label: `Grade dropped ${drop.toFixed(0)}% from last term (${previousScore}% → ${latestScore}%)`, severity: "high" as const, points: 3 };
          riskFactors.push(f);
          riskScore += f.points;
        } else if (drop >= 8) {
          const f = { label: `Grade declined ${drop.toFixed(0)}% from last term`, severity: "medium" as const, points: 2 };
          riskFactors.push(f);
          riskScore += f.points;
        }
      }

      // 3. Low average score (current/latest term)
      if (cards.length > 0) {
        const latestAvg = cards[0].averageScore ?? 0;
        if (latestAvg < 40) {
          const f = { label: `Overall average critically low: ${latestAvg}%`, severity: "high" as const, points: 3 };
          riskFactors.push(f);
          riskScore += f.points;
        } else if (latestAvg < 50) {
          const f = { label: `Overall average below 50%: ${latestAvg}%`, severity: "medium" as const, points: 2 };
          riskFactors.push(f);
          riskScore += f.points;
        }
      }

      // 4. Missed quizzes/exams
      const classId = student.studentClass?._id?.toString();
      if (classId) {
        const classExamIds = examsForClass.get(classId) || [];
        const studentSubmissions = submissionsByStudent.get(sid) || [];
        const submittedExamIds = new Set(studentSubmissions.map((s: any) => s.exam.toString()));
        const missedCount = classExamIds.filter(id => !submittedExamIds.has(id)).length;
        if (missedCount >= 5) {
          const f = { label: `Missed ${missedCount} assessments/quizzes`, severity: "high" as const, points: 3 };
          riskFactors.push(f);
          riskScore += f.points;
        } else if (missedCount >= 2) {
          const f = { label: `Missed ${missedCount} assessments/quizzes`, severity: "medium" as const, points: 2 };
          riskFactors.push(f);
          riskScore += f.points;
        }
      }

      // Determine risk level
      let riskLevel: "high" | "at_risk" | "stable";
      if (riskScore >= 6) riskLevel = "high";
      else if (riskScore >= 3) riskLevel = "at_risk";
      else riskLevel = "stable";

      const latestCard = cards[0];
      return {
        _id: student._id,
        name: student.name,
        email: student.email,
        class: student.studentClass,
        riskLevel,
        riskScore,
        riskFactors,
        attendanceRate: attRate,
        latestAverage: latestCard?.averageScore ?? null,
        latestGrade: latestCard?.overallGrade ?? null,
        latestTerm: latestCard?.term ?? null,
      };
    });

    // Sort by risk score descending
    results.sort((a, b) => b.riskScore - a.riskScore);

    const summary = {
      highRisk: results.filter(s => s.riskLevel === "high").length,
      atRisk: results.filter(s => s.riskLevel === "at_risk").length,
      stable: results.filter(s => s.riskLevel === "stable").length,
      total: results.length,
    };

    return NextResponse.json({ students: results, summary });
  } catch (error) {
    console.error("Early Warning Error:", error);
    return NextResponse.json({ message: "Server Error", error }, { status: 500 });
  }
}
