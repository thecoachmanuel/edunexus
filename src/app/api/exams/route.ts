export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Exam from "@/lib/models/exam";
import Submission from "@/lib/models/submission";
import { getAuthUser } from "@/middleware/auth";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const authUser = await getAuthUser(req, ["admin", "teacher", "student", "parent"]);
    
    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const classId = searchParams.get("classId");
    
    let query: any = {};
    if (classId) query.class = classId;
    if (authUser?.role === "student") {
      query.class = authUser.studentClass;
    }

    const [total, exams] = await Promise.all([
      Exam.countDocuments(query),
      Exam.find(query)
        .populate("class", "name")
        .populate("subject", "name code")
        .populate("teacher", "name")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
    ]);

    let finalExams = exams;
    if (authUser?.role === "student") {
      const mySubmissions = await Submission.find({ student: authUser._id }).select("exam").lean();
      const submittedExamIds = mySubmissions.map((s: any) => s.exam.toString());
      
      finalExams = exams.map((exam: any) => ({
        ...exam,
        hasSubmitted: submittedExamIds.includes(exam._id.toString())
      }));
    }

    return NextResponse.json({ exams: finalExams, pagination: { total, page, pages: Math.ceil(total / limit) } });
  } catch (error) {
    return NextResponse.json({ message: "Server Error", error }, { status: 500 });
  }
}
