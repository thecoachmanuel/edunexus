export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Timetable from "@/lib/models/timetable";
import AcademicYear from "@/lib/models/academicYear";
import Subject from "@/lib/models/subject";
import User from "@/lib/models/user";
import Class from "@/lib/models/class";
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
      .populate("schedule.periods.teacher")
      .lean();

    if (!timetable) {
      return NextResponse.json({ message: "Timetable not found" }, { status: 404 });
    }

    return NextResponse.json(timetable);
  } catch (error) {
    console.error("GET TIMETABLE ERROR", error);
    return NextResponse.json({ message: "Server Error", error }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> } // id is classId
) {
  try {
    await connectDB();
    const authUser = await getAuthUser(req, ["admin"]);
    if (!authUser) return NextResponse.json({ message: "Not authorized" }, { status: 401 });

    const { id: classId } = await params;
    
    // Clear all timetables for this specific class
    const result = await Timetable.deleteMany({ class: classId });
    if (result.deletedCount === 0) {
      return NextResponse.json({ message: "No timetable found to clear" }, { status: 404 });
    }

    return NextResponse.json({ message: "Timetable cleared successfully" });
  } catch (error) {
    console.error("DELETE TIMETABLE ERROR", error);
    return NextResponse.json({ message: "Server Error", error }, { status: 500 });
  }
}
