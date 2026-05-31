import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Timetable from "@/lib/models/timetable";
import { getAuthUser } from "@/middleware/auth";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: classId } = await params;
    await connectDB();
    const authUser = await getAuthUser(request, ["admin"]);
    if (!authUser) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();
    const { day, startTime, subjectId, teacherId, force } = body;

    if (!day || !startTime) {
      return NextResponse.json({ message: "Day and startTime are required" }, { status: 400 });
    }

    // 1. Check for teacher clash if teacherId is provided
    if (teacherId && !force) {
      const clash = await Timetable.findOne({
        school: authUser.schoolContext?._id,
        class: { $ne: classId }, // Exclude the current class
        "schedule.day": day,
        "schedule.periods": {
          $elemMatch: {
            startTime: startTime,
            teacher: teacherId,
          },
        },
      })
        .populate("class", "name")
        .lean();

      if (clash) {
        // Teacher is already teaching another class at this time
        const clashClassName = (clash.class as any)?.name || "Another Class";
        return NextResponse.json(
          { 
            message: `Teacher Clash: This teacher is already scheduled for ${clashClassName} on ${day} at ${startTime}. Do you want to proceed anyway?`,
            isClash: true
          },
          { status: 409 }
        );
      }
    }

    // 2. Perform the update
    // We need to update the specific period in the nested schedule array
    const timetable = await Timetable.findOne({ school: authUser.schoolContext?._id, class: classId });
    if (!timetable) {
      return NextResponse.json({ message: "Timetable not found" }, { status: 404 });
    }

    let updated = false;
    for (const d of timetable.schedule) {
      if (d.day === day) {
        for (const p of d.periods) {
          if (p.startTime === startTime) {
            p.subject = subjectId || null;
            p.teacher = teacherId || null;
            updated = true;
            break;
          }
        }
        
        // If not found in the existing periods, we create it
        if (!updated) {
          d.periods.push({
            startTime,
            endTime: body.endTime || startTime, // fallback if not provided
            subject: subjectId || null,
            teacher: teacherId || null,
          });
          // Sort periods by startTime
          d.periods.sort((a: any, b: any) => a.startTime.localeCompare(b.startTime));
          updated = true;
        }
        break;
      }
    }

    if (!updated) {
      // If the day doesn't exist at all, we could add it, but usually the 5 days exist.
      return NextResponse.json({ message: "Day not found in schedule" }, { status: 404 });
    }

    await timetable.save();

    return NextResponse.json({ message: "Period updated successfully" }, { status: 200 });
  } catch (error: any) {
    console.error("UPDATE PERIOD ERROR", error);
    return NextResponse.json({ message: error.message || "Server Error" }, { status: 500 });
  }
}
