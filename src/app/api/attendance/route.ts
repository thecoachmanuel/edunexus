export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Attendance from "@/lib/models/attendance";
import User from "@/lib/models/user";
import { getAuthUser } from "@/middleware/auth";
import { logActivity } from "@/lib/utils/activitieslog";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const authUser = await getAuthUser(req, ["admin", "teacher"]);
    if (!authUser) return NextResponse.json({ message: "Not authorized" }, { status: 401 });

    const searchParams = req.nextUrl.searchParams;
    const classId = searchParams.get("classId");
    const dateParam = searchParams.get("date"); // Expected format: YYYY-MM-DD

    if (!classId || !dateParam) {
      return NextResponse.json({ message: "classId and date are required" }, { status: 400 });
    }

    const date = new Date(dateParam);
    date.setUTCHours(0, 0, 0, 0); // Normalize to midnight UTC

    const attendanceRecord = await Attendance.findOne({ class: classId, date })
      .populate("recordedBy", "name")
      .populate("records.student", "name")
      .lean();

    return NextResponse.json({ attendance: attendanceRecord });
  } catch (error) {
    return NextResponse.json({ message: "Server Error", error }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const authUser = await getAuthUser(req, ["admin", "teacher"]);
    if (!authUser) return NextResponse.json({ message: "Not authorized" }, { status: 401 });

    const { classId, academicYearId, date: dateParam, records } = await req.json();

    if (!classId || !academicYearId || !dateParam || !records) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    const date = new Date(dateParam);
    date.setUTCHours(0, 0, 0, 0);

    // Update or Insert the attendance record
    const attendanceRecord = await Attendance.findOneAndUpdate(
      { class: classId, date },
      {
        class: classId,
        academicYear: academicYearId,
        date,
        recordedBy: authUser._id,
        records,
      },
      { upsert: true, new: true }
    );

    await logActivity({
      userId: authUser._id.toString(),
      action: "Marked Attendance",
      details: `Class: ${classId}, Date: ${dateParam}`,
    });

    return NextResponse.json(attendanceRecord, { status: 201 });
  } catch (error) {
    console.error("ATTENDANCE POST ERROR", error);
    return NextResponse.json({ message: "Server Error", error }, { status: 500 });
  }
}
