export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { connectDB } from "@/lib/db";
import ReportCard from "@/lib/models/reportCard";
import Attendance from "@/lib/models/attendance";
import { getAuthUser } from "@/middleware/auth";
import { aiRateLimiter } from "@/lib/rate-limit";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY as string);

export async function POST(req: NextRequest) {
  let reportCardId: string | null = null;
  try {
    const body = await req.json();
    reportCardId = body.reportCardId;
    if (!reportCardId) {
      return NextResponse.json({ message: "reportCardId is required" }, { status: 400 });
    }

    await connectDB();
    const authUser = await getAuthUser(req, ["admin", "teacher"]);
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

    // Fetch the full report card with populated data
    const report = await ReportCard.findById(reportCardId)
      .populate("student", "name")
      .populate("class", "name")
      .populate("grades.subject", "name")
      .populate("academicYear", "name")
      .lean() as any;

    if (!report) {
      return NextResponse.json({ message: "Report card not found" }, { status: 404 });
    }

    // Fetch student attendance rate
    const studentId = report.student._id;
    const attendanceLogs = await Attendance.find({
      "records.student": studentId,
      academicYear: report.academicYear._id,
    }).lean();

    let totalRecords = 0;
    let presentRecords = 0;
    attendanceLogs.forEach((att: any) => {
      const rec = att.records.find((r: any) => r.student.toString() === studentId.toString());
      if (rec) {
        totalRecords++;
        if (rec.status === "Present" || rec.status === "Late") presentRecords++;
      }
    });
    const attendanceRate = totalRecords === 0 ? 100 : Math.round((presentRecords / totalRecords) * 100);

    // Build subject breakdown for prompt
    const subjectLines = (report.grades || []).map((g: any) => {
      const subjectName = g.subject?.name || "Unknown Subject";
      const score = g.aggregateScore ?? 0;
      const grade = g.grade ?? "F";
      return `  - ${subjectName}: ${score}% (${grade})`;
    }).join("\n");

    // Identify strongest and weakest subjects
    const sortedGrades = [...(report.grades || [])].sort((a: any, b: any) => (b.aggregateScore ?? 0) - (a.aggregateScore ?? 0));
    const strongestSubject = sortedGrades[0]?.subject?.name || null;
    const weakestSubject = sortedGrades[sortedGrades.length - 1]?.subject?.name || null;

    const studentName = report.student?.name || "This student";
    const className = report.class?.name || "their class";
    const termName = report.term;
    const avg = report.averageScore ?? 0;
    const overallGrade = report.overallGrade ?? "F";
    const position = report.showPosition && report.position > 0 ? `${report.position} out of ${report.totalStudents}` : null;

    const prompt = `You are a professional schoolteacher writing a personal comment on a student's end-of-term report card for a Nigerian secondary school.

Student Details:
- Name: ${studentName}
- Class: ${className}
- Term: ${termName}
- Overall Average: ${avg}%
- Overall Grade: ${overallGrade}
${position ? `- Class Position: ${position}` : ""}
- Attendance Rate this term: ${attendanceRate}%
${strongestSubject ? `- Strongest Subject: ${strongestSubject}` : ""}
${weakestSubject && weakestSubject !== strongestSubject ? `- Subject Needing Most Improvement: ${weakestSubject}` : ""}

Subject Scores:
${subjectLines}

Write a personal teacher's comment (3–5 sentences) for this student's report card. Requirements:
1. Address the student by first name only (extract from "${studentName}").
2. Be warm, professional, and constructive — like a caring Nigerian schoolteacher.
3. Acknowledge specific strengths and areas for improvement based on the actual subject data.
4. If attendance is below 80%, briefly mention the importance of consistent attendance.
5. End with an encouraging note for the next term.
6. Do NOT mention grades or percentages directly — speak about performance qualitatively.
7. Do NOT use phrases like "As an AI" or "I am an AI".
8. Write in continuous prose — no bullet points.
`;

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(prompt);
    const narrative = result.response.text().trim();

    // Save the narrative back to the report card for persistence
    await ReportCard.findByIdAndUpdate(reportCardId, { aiNarrative: narrative });

    return NextResponse.json({ narrative });
  } catch (error) {
    console.error("AI Narrative Error (Using Fallback):", error);
    
    // Deterministic Rule-Based Fallback
    try {
      const fallbackReport = await ReportCard.findById(reportCardId).populate("student", "name").lean() as any;
      const fName = fallbackReport?.student?.name?.split(" ")[0] || "The student";
      const fAvg = fallbackReport?.averageScore || 0;
      
      let fallbackNarrative = "";
      if (fAvg >= 80) fallbackNarrative = `${fName} has demonstrated outstanding academic performance this term. Consistent effort has yielded excellent results across the board. Keep up the excellent work next term!`;
      else if (fAvg >= 60) fallbackNarrative = `${fName} has shown good performance this term, but there is still room for improvement in weaker subjects. With more focused study time, even better results can be achieved.`;
      else fallbackNarrative = `${fName}'s performance this term requires urgent attention. Consistent attendance and dedicated study time are highly recommended to ensure improvement next term.`;

      await ReportCard.findByIdAndUpdate(reportCardId, { aiNarrative: fallbackNarrative });
      return NextResponse.json({ narrative: fallbackNarrative });
    } catch (fallbackError) {
      return NextResponse.json({ message: "Failed to generate narrative", error }, { status: 500 });
    }
  }
}
