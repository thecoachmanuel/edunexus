import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Timetable from "@/lib/models/timetable";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const academicYearId = searchParams.get("academicYearId");
    const term = searchParams.get("term");

    if (!academicYearId || !term) {
      return NextResponse.json({ message: "Missing academicYearId or term" }, { status: 400 });
    }

    await dbConnect();

    // Populate class, teacher, subject for rich data
    const allTimetables = await Timetable.find({ academicYear: academicYearId, term })
      .populate("class", "name")
      .populate({
        path: "schedule.periods.teacher",
        select: "name",
      })
      .populate({
        path: "schedule.periods.subject",
        select: "name code",
      })
      .lean();

    const clashes: any[] = [];
    
    // Maps
    // teacherId -> { [day_startTime]: [ { classId, className, period } ] }
    const teacherMap: Record<string, Record<string, any[]>> = {};

    for (const tt of allTimetables) {
      const clsName = (tt.class as any)?.name || "Unknown Class";
      const clsId = (tt.class as any)?._id?.toString() || tt.class.toString();

      for (const daySchedule of tt.schedule || []) {
        const day = daySchedule.day;

        for (const period of daySchedule.periods || []) {
          if (!period.teacher) continue; // Skip breaks/free periods

          const tId = period.teacher._id?.toString() || period.teacher.toString();
          const tName = period.teacher.name || "Unknown Teacher";
          const sName = period.subject?.name || "Unknown Subject";

          if (!teacherMap[tId]) teacherMap[tId] = {};
          
          const timeKey = `${day}_${period.startTime}_${period.endTime}`;
          if (!teacherMap[tId][timeKey]) teacherMap[tId][timeKey] = [];

          teacherMap[tId][timeKey].push({
            classId: clsId,
            className: clsName,
            teacherId: tId,
            teacherName: tName,
            subjectName: sName,
            day: day,
            startTime: period.startTime,
            endTime: period.endTime,
          });
        }
      }
    }

    // Identify clashes
    Object.keys(teacherMap).forEach((tId) => {
      Object.keys(teacherMap[tId]).forEach((timeKey) => {
        const slots = teacherMap[tId][timeKey];
        if (slots.length > 1) {
          // CLASH DETECTED!
          clashes.push({
            id: `${tId}_${timeKey}`,
            type: "teacher_double_booked",
            teacherId: tId,
            teacherName: slots[0].teacherName,
            day: slots[0].day,
            startTime: slots[0].startTime,
            endTime: slots[0].endTime,
            involvedClasses: slots.map(s => ({
              classId: s.classId,
              className: s.className,
              subjectName: s.subjectName
            }))
          });
        }
      });
    });

    return NextResponse.json({ clashes, scannedClasses: allTimetables.length }, { status: 200 });

  } catch (error: any) {
    console.error("[Timetable Audit]", error);
    return NextResponse.json({ message: "Server Error", error: error.message }, { status: 500 });
  }
}
