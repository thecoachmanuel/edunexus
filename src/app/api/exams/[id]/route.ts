import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Exam from "@/lib/models/exam";
import Submission from "@/lib/models/submission";
import { getAuthUser } from "@/middleware/auth";
import { logActivity } from "@/lib/utils/activitieslog";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    const authUser = await getAuthUser(req);
    let shouldShowCorrectAnswers = false;

    if (authUser) {
      if (authUser.role === "admin" || authUser.role === "teacher") {
        shouldShowCorrectAnswers = true;
      } else if (authUser.role === "student") {
        const hasSubmitted = await Submission.exists({ exam: id, student: authUser._id });
        if (hasSubmitted) {
          shouldShowCorrectAnswers = true;
        }
      }
    }

    const query = Exam.findById(id)
      .populate("class", "name")
      .populate("subject", "name code")
      .populate("teacher", "name");

    if (shouldShowCorrectAnswers) {
      query.select("+questions.correctAnswer");
    }

    const exam = await query.lean();

    if (!exam) {
      return NextResponse.json({ message: "Exam not found" }, { status: 404 });
    }

    return NextResponse.json(exam);
  } catch (error) {
    console.error("GET EXAM ERROR", error);
    return NextResponse.json({ message: "Server Error", error }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const authUser = await getAuthUser(req, ["admin", "teacher"]);
    if (!authUser) return NextResponse.json({ message: "Not authorized" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();

    const updatedExam = await Exam.findByIdAndUpdate(id, body, { new: true });
    
    if (!updatedExam) {
      return NextResponse.json({ message: "Exam not found" }, { status: 404 });
    }

    await logActivity({
      userId: authUser._id.toString(),
      action: "Updated Exam",
      details: `Updated exam ID: ${id}`,
    });

    return NextResponse.json({ message: "Exam updated successfully", exam: updatedExam });
  } catch (error) {
    console.error("PATCH EXAM ERROR", error);
    return NextResponse.json({ message: "Server Error", error }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const authUser = await getAuthUser(req, ["admin", "teacher"]);
    if (!authUser) return NextResponse.json({ message: "Not authorized" }, { status: 401 });

    const { id } = await params;
    
    const deletedExam = await Exam.findByIdAndDelete(id);
    if (!deletedExam) {
      return NextResponse.json({ message: "Exam not found" }, { status: 404 });
    }

    await logActivity({
      userId: authUser._id.toString(),
      action: "Deleted Exam",
      details: `Deleted exam: ${deletedExam.title}`,
    });

    return NextResponse.json({ message: "Exam deleted successfully" });
  } catch (error) {
    console.error("DELETE EXAM ERROR", error);
    return NextResponse.json({ message: "Server Error", error }, { status: 500 });
  }
}
