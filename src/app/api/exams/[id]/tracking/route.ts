export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Exam from "@/lib/models/exam";
import Submission from "@/lib/models/submission";
import User from "@/lib/models/user";
import { getAuthUser } from "@/middleware/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    const authUser = await getAuthUser(req, ["admin", "teacher"]);
    if (!authUser) {
      return NextResponse.json({ message: "Not authorized" }, { status: 401 });
    }

    const exam = await Exam.findById(id).lean();
    if (!exam) {
      return NextResponse.json({ message: "Exam not found" }, { status: 404 });
    }

    // 1. Get all students in this exam's class (scoped to the exam's school)
    const allStudents = await User.find({ school: (exam as any).school, role: "student", studentClass: exam.class })
      .select("name email _id")
      .lean();

    // 2. Get all submissions for this exam
    const submissions = await Submission.find({ exam: id })
      .populate("student", "name email _id")
      .lean();

    // 3. Separate students into completed and missing
    const submittedStudentIds = new Set(
      submissions.map((sub: any) => sub.student?._id?.toString())
    );

    const missingStudents = allStudents.filter(
      (student: any) => !submittedStudentIds.has(student._id.toString())
    );

    const formattedSubmissions = submissions.map((sub: any) => {
      const totalPoints = (exam as any).questions?.reduce(
        (acc: number, q: any) => acc + (q.points || 1),
        0
      ) || 0;
      
      const percentage = totalPoints > 0 ? Math.round((sub.score / totalPoints) * 100) : 0;

      return {
        _id: sub._id.toString(),
        student: {
          _id: sub.student?._id?.toString(),
          name: sub.student?.name || "Unknown Student",
          email: sub.student?.email || "",
        },
        score: sub.score,
        totalPoints,
        percentage,
        submittedAt: sub.createdAt,
      };
    });

    return NextResponse.json({
      totalStudents: allStudents.length,
      submissions: formattedSubmissions,
      missingStudents: missingStudents.map((s: any) => ({
        _id: s._id.toString(),
        name: s.name,
        email: s.email,
      })),
    });
  } catch (error) {
    console.error("GET EXAM TRACKING ERROR", error);
    return NextResponse.json({ message: "Server Error", error }, { status: 500 });
  }
}
