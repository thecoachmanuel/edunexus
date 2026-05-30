export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Timetable from "@/lib/models/timetable";
import User from "@/lib/models/user";
import jwt from "jsonwebtoken";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const token = req.cookies.get("jwt")?.value;
    if (!token) {
      return NextResponse.json({ message: "Not authorized" }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
      userId: string;
    };
    const user = await User.findById(decoded.userId).lean();
    if (!user) {
      return NextResponse.json({ message: "Not authorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    let targetTeacherId = resolvedParams.id;
    if (targetTeacherId === "me") {
      if (user.role !== "teacher") {
        return NextResponse.json(
          { message: "Only teachers can use 'me' parameter" },
          { status: 403 }
        );
      }
      targetTeacherId = user._id.toString();
    } else {
      if (user.role !== "admin") {
        return NextResponse.json(
          { message: "Only admins can view other teachers' timetables" },
          { status: 403 }
        );
      }
    }

    const timetables = await Timetable.find({
      "schedule.periods.teacher": targetTeacherId,
    })
      .populate("class", "name")
      .populate("schedule.periods.subject", "name code")
      .populate("schedule.periods.teacher", "name")
      .lean();

    const scheduleMap = new Map();
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
    days.forEach((day) => scheduleMap.set(day, []));

    timetables.forEach((tt) => {
      if (!tt.schedule) return;
      tt.schedule.forEach((daySchedule: any) => {
        if (!scheduleMap.has(daySchedule.day)) return;

        const teacherPeriods = daySchedule.periods.filter(
          (p: any) =>
            p.teacher && p.teacher._id.toString() === targetTeacherId.toString()
        );

        teacherPeriods.forEach((p: any) => {
          scheduleMap.get(daySchedule.day).push({
            ...p,
            class: tt.class, // Attach the class to the period payload
          });
        });
      });
    });

    const finalSchedule = days.map((day) => {
      const periods = scheduleMap.get(day);
      periods.sort((a: any, b: any) => a.startTime.localeCompare(b.startTime));
      return {
        day,
        periods,
      };
    });

    return NextResponse.json({ schedule: finalSchedule });
  } catch (error) {
    console.error("TEACHER TIMETABLE GET ERROR:", error);
    return NextResponse.json({ message: "Server Error" }, { status: 500 });
  }
}
