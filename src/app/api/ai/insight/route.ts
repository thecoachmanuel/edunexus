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

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY as string);

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const authUser = await getAuthUser(req, ["admin", "teacher", "student"]);
    if (!authUser) {
      return NextResponse.json({ message: "Not authorized" }, { status: 401 });
    }

    // Apply Rate Limiting (10 requests per minute per user)
    const rateLimit = aiRateLimiter.check(authUser._id.toString());
    if (!rateLimit.success) {
      return NextResponse.json(
        { message: "Too many AI requests. Please try again in a minute." },
        { status: 429 }
      );
    }

    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return NextResponse.json(
        { message: "Google Gemini API Key is missing" },
        { status: 500 }
      );
    }

    // Gather rich context to make the insight highly relevant and specific
    let contextData = "";
    
    if (authUser.role === "admin") {
      const totalStudents = await User.countDocuments({ role: "student" });
      const totalTeachers = await User.countDocuments({ role: "teacher" });
      const activeExams = await Exam.countDocuments({ isActive: true });
      const upcomingEvents = await Event.countDocuments({ startDate: { $gte: new Date() } });
      const pendingTasks = await Task.countDocuments({ status: { $ne: "Done" } });
      
      contextData = `Role: Administrator. 
      System snapshot: ${totalStudents} students, ${totalTeachers} teachers, ${activeExams} active quizzes running, ${upcomingEvents} upcoming events scheduled, and ${pendingTasks} overall pending kanban tasks in the workspace.`;
      
    } else if (authUser.role === "teacher") {
      const myClassesCount = await Class.countDocuments({ classTeacher: authUser._id });
      const myExams = await Exam.find({ teacher: authUser._id }).select("_id").lean();
      const myExamIds = myExams.map((exam) => exam._id);
      const pendingGrading = await Submission.countDocuments({ exam: { $in: myExamIds }, score: 0 });
      const myTasks = await Task.countDocuments({ assignee: authUser._id, status: { $ne: "Done" } });
      const myEvents = await Event.countDocuments({ startDate: { $gte: new Date() } });
      
      contextData = `Role: Teacher. Name: ${authUser.name}.
      Current load: Managing ${myClassesCount} classes. You have ${pendingGrading} student quiz submissions pending your grading, ${myTasks} assigned kanban tasks pending, and ${myEvents} upcoming school events.`;
      
    } else if (authUser.role === "student") {
      const upcomingExams = await Exam.countDocuments({ class: authUser.studentClass, isActive: true, dueDate: { $gte: new Date() } });
      
      // Calculate attendance
      const studentAttendance = await Attendance.find({ "records.student": authUser._id }).lean();
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
      const myTasks = await Task.countDocuments({ assignee: authUser._id, status: { $ne: "Done" } });

      contextData = `Role: Student. Name: ${authUser.name}.
      Current status: You have ${upcomingExams} upcoming quizzes due, a current attendance rate of ${attendanceRate}, and ${myTasks} personal kanban tasks to complete.`;
    }

    const prompt = `
      You are an AI Academic Advisor for a school management system called Edunexus.
      You are speaking directly to a user. Here is their context: ${contextData}
      
      Generate a single, brief, professional, and highly insightful academic tip or observation based on their role. 
      Do not say "As an AI" or give generic robotic responses. Make it sound like a helpful, proactive human advisor.
      IMPORTANT: When giving advice to students about their instructors, ALWAYS refer to them as "teachers", never as "professors" or "lecturers".
      Keep it to 2-3 sentences maximum.
    `;

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(prompt);
    const textResponse = result.response.text();

    return NextResponse.json({ text: textResponse });
  } catch (error) {
    console.error("AI INSIGHT ERROR", error);
    return NextResponse.json({ message: "Server Error", error }, { status: 500 });
  }
}
