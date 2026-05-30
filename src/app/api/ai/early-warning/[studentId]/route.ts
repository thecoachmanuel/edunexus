export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { connectDB } from "@/lib/db";
import User from "@/lib/models/user";
import Attendance from "@/lib/models/attendance";
import ReportCard from "@/lib/models/reportCard";
import { getAuthUser } from "@/middleware/auth";
import { aiRateLimiter } from "@/lib/rate-limit";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY as string);

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    await connectDB();
    const authUser = await getAuthUser(req, ["admin"]);
    if (!authUser) {
      return NextResponse.json({ message: "Not authorized" }, { status: 401 });
    }

    const rateLimit = aiRateLimiter.check(authUser._id.toString());
    if (!rateLimit.success) {
      return NextResponse.json(
        { message: "Too many AI requests. Please try again in a minute." },
        { status: 429 }
      );
    }

    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return NextResponse.json({ message: "Google Gemini API Key is missing" }, { status: 500 });
    }

    const { studentId } = await params;

    const student = await User.findById(studentId)
      .select("name email studentClass")
      .populate("studentClass", "name")
      .lean() as any;

    if (!student) {
      return NextResponse.json({ message: "Student not found" }, { status: 404 });
    }

    // Fetch attendance
    const fourWeeksAgo = new Date();
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
    const recentAttendance = await Attendance.find({
      "records.student": studentId,
      date: { $gte: fourWeeksAgo },
    }).lean() as any[];

    let total = 0, present = 0;
    recentAttendance.forEach((att: any) => {
      const rec = att.records.find((r: any) => r.student.toString() === studentId);
      if (rec) {
        total++;
        if (rec.status === "Present" || rec.status === "Late") present++;
      }
    });
    const attRate = total === 0 ? 100 : Math.round((present / total) * 100);

    // Fetch last two report cards
    const cards = await ReportCard.find({ student: studentId })
      .populate("grades.subject", "name")
      .sort({ createdAt: -1 })
      .limit(2)
      .lean() as any[];

    const latestCard = cards[0];
    const prevCard = cards[1];

    let subjectContext = "";
    if (latestCard?.grades?.length) {
      const sorted = [...latestCard.grades].sort((a: any, b: any) => (b.aggregateScore ?? 0) - (a.aggregateScore ?? 0));
      const top3Weak = sorted.slice(-3).reverse().map((g: any) => `${g.subject?.name || "Subject"} (${g.aggregateScore ?? 0}%)`).join(", ");
      const top3Strong = sorted.slice(0, 3).map((g: any) => `${g.subject?.name || "Subject"} (${g.aggregateScore ?? 0}%)`).join(", ");
      subjectContext = `
Strongest subjects: ${top3Strong}.
Weakest subjects: ${top3Weak}.
Overall average: ${latestCard.averageScore ?? 0}% (${latestCard.overallGrade ?? "N/A"}).
${prevCard ? `Previous term average: ${prevCard.averageScore ?? 0}%.` : "No previous term data."}`;
    }

    const prompt = `You are an experienced school academic counsellor advising a Nigerian secondary school teacher or administrator about an at-risk student.

Student: ${student.name}
Class: ${student.studentClass?.name || "Unknown"}
Attendance rate (last 4 weeks): ${attRate}%
${subjectContext}

This student has been flagged by the EduNexus Early Warning System as potentially at risk of academic failure.

Generate a specific, actionable 3-point intervention plan for this student. Requirements:
1. Be practical and realistic for a Nigerian school setting (limited resources, large class sizes).
2. Give specific actionable steps, not generic advice.
3. Address the specific weak areas shown in the data (attendance, specific subjects, etc.).
4. Format as three numbered recommendations.
5. Keep each recommendation to 2–3 sentences.
6. Do NOT start with "As an AI".
7. Speak professionally to the teacher/admin reading this.
`;

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(prompt);
    const plan = result.response.text().trim();

    return NextResponse.json({ plan, studentName: student.name });
  } catch (error) {
    console.error("Intervention Plan Error:", error);
    return NextResponse.json({ message: "Failed to generate intervention plan", error }, { status: 500 });
  }
}
