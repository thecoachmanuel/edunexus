export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Submission from "@/lib/models/submission";
import { getAuthUser } from "@/middleware/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const authUser = await getAuthUser(req, ["student"]);
    if (!authUser) return NextResponse.json({ message: "Not authorized" }, { status: 401 });

    const { id } = await params;

    const submission = await Submission.findOne({ exam: id, student: authUser._id });
    
    if (!submission) {
      return NextResponse.json({ message: "Result not found" }, { status: 404 });
    }

    return NextResponse.json(submission);
  } catch (error) {
    console.error("GET RESULT ERROR", error);
    return NextResponse.json({ message: "Server Error", error }, { status: 500 });
  }
}
