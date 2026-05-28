import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Timetable from "@/lib/models/timetable";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const searchParams = req.nextUrl.searchParams;
    const academicYear = searchParams.get("academicYear");
    const classId = searchParams.get("class");
    
    let query: any = {};
    if (academicYear) query.academicYear = academicYear;
    if (classId) query.class = classId;

    const timetables = await Timetable.find(query)
      .populate("class", "name")
      .populate("academicYear", "name")
      .populate("schedule.subject", "name code")
      .populate("schedule.teacher", "name email")
      .lean();

    return NextResponse.json(timetables);
  } catch (error) {
    return NextResponse.json({ message: "Server Error", error }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const { classId, academicYear, schedule } = await req.json();

    const existingTimetable = await Timetable.findOne({ class: classId, academicYear });
    if (existingTimetable) {
      return NextResponse.json({ message: "Timetable already exists for this class and year" }, { status: 400 });
    }

    const timetable = await Timetable.create({ class: classId, academicYear, schedule });
    return NextResponse.json(timetable, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: "Server Error", error }, { status: 500 });
  }
}
