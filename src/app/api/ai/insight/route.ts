export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { connectDB } from "@/lib/db";
import User from "@/lib/models/user";
import Class from "@/lib/models/class";
import Exam from "@/lib/models/exam";
import Attendance from "@/lib/models/attendance";
import Submission from "@/lib/models/submission";
import { Task } from "@/lib/models/task";
import { Event } from "@/lib/models/event";
import { getAuthUser } from "@/middleware/auth";
import { aiRateLimiter } from "@/lib/rate-limit";

// Deterministic fallback insights keyed by role
const FALLBACK_INSIGHTS: Record<string, string> = {
  admin: "Review your attendance trends this week — early identification of chronic absenteeism helps you intervene before it impacts academic performance. Consider scheduling a briefing with class teachers on their most recent results.",
  teacher: "Take a moment to review your students' recent quiz submissions. Timely feedback significantly improves learning outcomes and helps students stay on track before the next assessment.",
  student: "Consistency is key — make sure you've reviewed your notes from the last class before your next quiz. Students who revise regularly score up to 30% higher than those who cram.",
};

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const authUser = await getAuthUser(req, ["admin", "teacher", "student"]);
    if (!authUser) {
      return NextResponse.json({ message: "Not authorized" }, { status: 401 });
    }

    // Rate limiting
    const rateLimit = aiRateLimiter.check(authUser._id.toString());
    if (!rateLimit.success) {
      return NextResponse.json(
        { message: "Too many AI requests. Please try again in a minute." },
        { status: 429 }
      );
    }

    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      // Return a deterministic fallback if no API key configured
      const fallback = FALLBACK_INSIGHTS[authUser.role] || FALLBACK_INSIGHTS.teacher;
      return NextResponse.json({ text: fallback });
    }

    // Gather context data
    let contextData = "";

    if (authUser.role === "admin") {
      const [totalStudents, totalTeachers, activeExams, upcomingEvents, pendingTasks] =
        await Promise.all([
          User.countDocuments({ school: authUser.schoolContext?._id, role: "student" }),
          User.countDocuments({ school: authUser.schoolContext?._id, role: "teacher" }),
          Exam.countDocuments({ school: authUser.schoolContext?._id, isActive: true }),
          Event.countDocuments({ school: authUser.schoolContext?._id, startDate: { $gte: new Date() } }),
          Task.countDocuments({ school: authUser.schoolContext?._id, status: { $ne: "Done" } }),
        ]);

      contextData = `Role: Administrator. System snapshot: ${totalStudents} students, ${totalTeachers} teachers, ${activeExams} active quizzes running, ${upcomingEvents} upcoming events scheduled, and ${pendingTasks} overall pending kanban tasks.`;

    } else if (authUser.role === "teacher") {
      const [myClassesCount, myExams, myTasks, myEvents] = await Promise.all([
        Class.countDocuments({ school: authUser.schoolContext?._id, classTeacher: authUser._id }),
        Exam.find({ school: authUser.schoolContext?._id, teacher: authUser._id }).select("_id").lean(),
        Task.countDocuments({ school: authUser.schoolContext?._id, assignee: authUser._id, status: { $ne: "Done" } }),
        Event.countDocuments({ school: authUser.schoolContext?._id, startDate: { $gte: new Date() } }),
      ]);
      const pendingGrading = await Submission.countDocuments({
        school: authUser.schoolContext?._id,
        exam: { $in: myExams.map((e) => e._id) },
        score: 0,
      });

      contextData = `Role: Teacher. Name: ${authUser.name}. Managing ${myClassesCount} classes. ${pendingGrading} student submissions pending grading, ${myTasks} assigned tasks pending, ${myEvents} upcoming school events.`;

    } else if (authUser.role === "student") {
      const [upcomingExams, studentAttendance, myTasks] = await Promise.all([
        Exam.countDocuments({ school: authUser.schoolContext?._id, class: authUser.studentClass, isActive: true, dueDate: { $gte: new Date() } }),
        Attendance.find({ school: authUser.schoolContext?._id, "records.student": authUser._id }).lean(),
        Task.countDocuments({ school: authUser.schoolContext?._id, assignee: authUser._id, status: { $ne: "Done" } }),
      ]);

      let totalMyRecords = 0;
      let myPresentRecords = 0;
      studentAttendance.forEach((att: any) => {
        const rec = att.records.find((r: any) => r.student.toString() === authUser._id.toString());
        if (rec) {
          totalMyRecords++;
          if (rec.status === "Present" || rec.status === "Late") myPresentRecords++;
        }
      });
      const attendanceRate = totalMyRecords === 0 ? "100%" : `${Math.round((myPresentRecords / totalMyRecords) * 100)}%`;

      contextData = `Role: Student. Name: ${authUser.name}. ${upcomingExams} upcoming quizzes due, attendance rate: ${attendanceRate}, ${myTasks} personal tasks to complete.`;
    }

    const prompt = `
      You are the AI Academic Advisor for ${authUser.schoolContext?.name || "this school"}.
      You are speaking directly to a user. Here is their context: ${contextData}
      
      Generate a single, brief, professional, and highly insightful academic tip or observation based on their role. 
      Do not say "As an AI" or give generic robotic responses. Make it sound like a helpful, proactive human advisor.
      IMPORTANT: When giving advice to students about their instructors, ALWAYS refer to them as "teachers", never as "professors" or "lecturers".
      Keep it to 2-3 sentences maximum.
    `;

    try {
      const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY as string);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const result = await model.generateContent(prompt);
      const textResponse = result.response.text();
      return NextResponse.json({ text: textResponse });
    } catch (aiError: any) {
      // Gracefully fall back to a deterministic insight rather than crashing
      console.warn("AI INSIGHT: Gemini API failed, using fallback.", aiError?.message);
      const errMsg = aiError?.message || String(aiError);
      const isOverloaded = errMsg.includes("503") || errMsg.includes("overloaded") || errMsg.includes("high demand");
      const isQuota = errMsg.includes("429") || errMsg.includes("quota") || errMsg.includes("rate");

      if (isOverloaded) {
        // Still return a useful insight even when AI is down
        return NextResponse.json({
          text: FALLBACK_INSIGHTS[authUser.role] || FALLBACK_INSIGHTS.teacher,
          notice: "AI model temporarily busy — showing cached insight.",
        });
      }
      if (isQuota) {
        return NextResponse.json({
          text: FALLBACK_INSIGHTS[authUser.role] || FALLBACK_INSIGHTS.teacher,
          notice: "AI quota reached — showing cached insight.",
        });
      }

      // Unknown AI error — still return fallback, don't throw 500 to frontend
      return NextResponse.json({
        text: FALLBACK_INSIGHTS[authUser.role] || FALLBACK_INSIGHTS.teacher,
      });
    }
  } catch (error: any) {
    console.error("AI INSIGHT DB/AUTH ERROR", error?.message || error);
    return NextResponse.json({ message: "Server error. Please try again." }, { status: 500 });
  }
}


