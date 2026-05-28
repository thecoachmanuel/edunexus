import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { connectDB } from "@/lib/db";
import User from "@/lib/models/user";
import Class from "@/lib/models/class";
import Exam from "@/lib/models/exam";
import { getAuthUser } from "@/middleware/auth";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY as string);

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const authUser = await getAuthUser(req, ["admin", "teacher", "student"]);
    if (!authUser) {
      return NextResponse.json({ message: "Not authorized" }, { status: 401 });
    }

    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return NextResponse.json(
        { message: "Google Gemini API Key is missing" },
        { status: 500 }
      );
    }

    // Gather some basic context to make the insight somewhat relevant
    let contextData = "";
    if (authUser.role === "admin") {
      const totalStudents = await User.countDocuments({ role: "student" });
      const totalTeachers = await User.countDocuments({ role: "teacher" });
      const activeExams = await Exam.countDocuments({ isActive: true });
      contextData = `Role: Administrator. System has ${totalStudents} students, ${totalTeachers} teachers, and ${activeExams} active exams.`;
    } else if (authUser.role === "teacher") {
      const myClassesCount = await Class.countDocuments({ classTeacher: authUser._id });
      contextData = `Role: Teacher. Manages ${myClassesCount} classes.`;
    } else if (authUser.role === "student") {
      contextData = `Role: Student. Name: ${authUser.name}.`;
    }

    const prompt = `
      You are an AI Academic Advisor for a school management system called Edunexus.
      You are speaking directly to a user. Here is their context: ${contextData}
      
      Generate a single, brief, professional, and highly insightful academic tip or observation based on their role. 
      Do not say "As an AI" or give generic robotic responses. Make it sound like a helpful, proactive human advisor.
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
