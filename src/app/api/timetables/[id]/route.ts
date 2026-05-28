import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Timetable from "@/lib/models/timetable";
import { getAuthUser } from "@/middleware/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> } // id is actually classId here based on frontend usage
) {
  try {
    await connectDB();
    const authUser = await getAuthUser(req, ["admin", "teacher", "student", "parent"]);
    if (!authUser) return NextResponse.json({ message: "Not authorized" }, { status: 401 });

    const { id: classId } = await params;
    
    // In our system, timetable is usually linked to academicYear as well, 
    // but the frontend simply passes classId. We'll fetch the most recent one for the class.
    const timetable = await Timetable.findOne({ class: classId })
      .sort({ updatedAt: -1 })
      .populate("academicYear")
      .populate("schedule.periods.subject")
      .populate("schedule.periods.teacher");

    if (!timetable) {
      return NextResponse.json({ message: "Timetable not found" }, { status: 404 });
    }

    return NextResponse.json(timetable);
  } catch (error) {
    console.error("GET TIMETABLE ERROR", error);
    return NextResponse.json({ message: "Server Error", error }, { status: 500 });
  }
}
