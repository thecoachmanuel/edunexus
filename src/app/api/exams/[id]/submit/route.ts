import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Exam from "@/lib/models/exam";
import Submission from "@/lib/models/submission";
import { getAuthUser } from "@/middleware/auth";
import { logActivity } from "@/lib/utils/activitieslog";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const authUser = await getAuthUser(req, ["student"]);
    if (!authUser) return NextResponse.json({ message: "Not authorized" }, { status: 401 });

    const { id } = await params;
    const { answers } = await req.json();

    const exam = await Exam.findById(id);
    if (!exam) return NextResponse.json({ message: "Exam not found" }, { status: 404 });

    if (!exam.isActive || new Date() > new Date(exam.dueDate)) {
      return NextResponse.json({ message: "Exam is no longer active" }, { status: 400 });
    }

    const existingSubmission = await Submission.findOne({ exam: id, student: authUser._id });
    if (existingSubmission) {
      return NextResponse.json({ message: "You have already submitted this exam" }, { status: 400 });
    }

    let score = 0;
    const gradedAnswers = answers.map((ans: any) => {
      const question = exam.questions.find((q: any) => q._id.toString() === ans.questionId);
      const isCorrect = question && question.correctAnswer === ans.answer;
      if (isCorrect) score += question.points || 1;
      return {
        questionId: ans.questionId,
        answer: ans.answer,
        isCorrect
      };
    });

    const submission = await Submission.create({
      exam: id,
      student: authUser._id,
      answers: gradedAnswers,
      score,
    });

    await logActivity({
      userId: authUser._id.toString(),
      action: "Submitted Exam",
      details: `Submitted exam: ${exam.title} with score ${score}`,
    });

    return NextResponse.json({ message: "Exam submitted", score, submission });
  } catch (error) {
    console.error("SUBMIT EXAM ERROR", error);
    return NextResponse.json({ message: "Server Error", error }, { status: 500 });
  }
}
