import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Attendance from "@/lib/models/attendance";
import { getAuthUser } from "@/middleware/auth";
import AcademicYear from "@/lib/models/academicYear";
import { startOfDay, endOfDay, isWeekend, addDays, isBefore, isAfter, format } from "date-fns";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const authUser = await getAuthUser(req, ["admin", "teacher"]);
    if (!authUser) return NextResponse.json({ message: "Not authorized" }, { status: 401 });

    const searchParams = req.nextUrl.searchParams;
    const classId = searchParams.get("classId");
    const yearId = searchParams.get("academicYearId");

    if (!classId || !yearId) {
      return NextResponse.json({ message: "classId and academicYearId are required" }, { status: 400 });
    }

    const year = await AcademicYear.findById(yearId).lean();
    if (!year) {
      return NextResponse.json({ message: "Invalid academic year" }, { status: 400 });
    }

    const term = searchParams.get("term") || year.activeTerm;
    const activeTermDoc = year.terms?.find((t: any) => t.term === term);

    let startDateRaw = year.fromYear;
    let endDateRaw = year.toYear;

    if (activeTermDoc) {
      startDateRaw = activeTermDoc.startDate;
      endDateRaw = activeTermDoc.endDate;
    }

    if (!startDateRaw) {
       return NextResponse.json({ message: "Academic year dates not configured" }, { status: 400 });
    }

    // Determine the date range
    const startDate = new Date(startDateRaw);
    const today = new Date();
    // End date is either today or the end of the term, whichever is earlier
    const termEndDate = endDateRaw ? new Date(endDateRaw) : today;
    const endDate = termEndDate < today ? termEndDate : today;

    if (isBefore(endDate, startDate)) {
      return NextResponse.json({ missedDays: [] });
    }

    // Fetch all attendance dates for this class
    const attendances = await Attendance.find({
      class: classId,
      academicYear: yearId,
      date: { $gte: startOfDay(startDate), $lte: endOfDay(endDate) }
    }).select("date").lean();

    const recordedDates = new Set(attendances.map(a => format(new Date(a.date), "yyyy-MM-dd")));

    // Generate all weekdays between startDate and endDate
    const missedDays: string[] = [];
    let currentDate = startDate;

    while (isBefore(currentDate, endDate) || format(currentDate, "yyyy-MM-dd") === format(endDate, "yyyy-MM-dd")) {
      if (!isWeekend(currentDate)) {
        const dateString = format(currentDate, "yyyy-MM-dd");
        if (!recordedDates.has(dateString)) {
          missedDays.push(dateString);
        }
      }
      currentDate = addDays(currentDate, 1);
    }

    // Optional: Sort missed days descending (newest missed first)
    missedDays.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    return NextResponse.json({ missedDays });
  } catch (error) {
    console.error("MISSED ATTENDANCE ERROR", error);
    return NextResponse.json({ message: "Server Error", error }, { status: 500 });
  }
}
