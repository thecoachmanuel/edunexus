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
    const searchParams = req.nextUrl.searchParams;
    let term = searchParams.get("term");

    if (!term) {
      const currentYear = await AcademicYear.findOne({ isCurrent: true }).lean();
      if (currentYear) {
        term = currentYear.activeTerm;
      }
    }

    const query: any = { school: authUser.schoolContext?._id, class: classId };
    if (term) query.term = term;
    const timetable = await Timetable.findOne(query)
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
    const searchParams = req.nextUrl.searchParams;
    let term = searchParams.get("term");

    if (!term) {
      const currentYear = await AcademicYear.findOne({ isCurrent: true }).lean();
      if (currentYear) {
        term = currentYear.activeTerm;
      }
    }

    const query: any = { school: authUser.schoolContext?._id, class: classId };
    if (term) query.term = term;
    
    // Clear timetable for this specific class and term
    const result = await Timetable.deleteMany(query);
    if (result.deletedCount === 0) {
      return NextResponse.json({ message: "No timetable found to clear" }, { status: 404 });
    }

    return NextResponse.json({ message: "Timetable cleared successfully" });
  } catch (error) {
    console.error("DELETE TIMETABLE ERROR", error);
    return NextResponse.json({ message: "Server Error", error }, { status: 500 });
  }
}
