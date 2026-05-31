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
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "9")));
    const classId = searchParams.get("classId");
    const isActiveParam = searchParams.get("isActive"); // "true" | "false" | null (all)
    const search = searchParams.get("search") || "";

    let query: any = {};
    if (authUser?.schoolContext?._id) {
      query.school = authUser.schoolContext._id;
    }

    if (classId) query.class = classId;
    if (authUser?.role === "student") {
      query.class = authUser.studentClass;
    }
    // Teacher only sees their own quizzes; admin sees all
    if (authUser?.role === "teacher") {
      query.teacher = authUser._id;
    }

    // Filter by active/inactive status
    if (isActiveParam === "true") query.isActive = true;
    else if (isActiveParam === "false") query.isActive = false;

    // Optional search by title
    if (search) {
      query.title = { $regex: search, $options: "i" };
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
        hasSubmitted: submittedExamIds.includes(exam._id.toString()),
      }));
    }

    return NextResponse.json({
      exams: finalExams,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return NextResponse.json({ message: "Server Error", error }, { status: 500 });
  }
}
