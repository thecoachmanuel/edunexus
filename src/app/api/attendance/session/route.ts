export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import Attendance from "@/lib/models/attendance";
import Class from "@/lib/models/class";
import User from "@/lib/models/user";
import { getAuthUser } from "@/middleware/auth";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const authUser = await getAuthUser(req, ["admin", "teacher"]);
    if (!authUser)
      return NextResponse.json({ message: "Not authorized" }, { status: 401 });

    const searchParams = req.nextUrl.searchParams;
    const classId = searchParams.get("classId");
    const academicYearId = searchParams.get("academicYearId");

    if (!classId || !academicYearId) {
      return NextResponse.json(
        { message: "classId and academicYearId are required" },
        { status: 400 }
      );
    }

    // Teachers can only view their own assigned class
    if (authUser.role === "teacher") {
      const cls = await Class.findById(classId);
      if (!cls || cls.classTeacher?.toString() !== authUser._id.toString()) {
        return NextResponse.json(
          { message: "Not authorized to view this class" },
          { status: 403 }
        );
      }
    }

    // MongoDB aggregation: unwind each day's records and group by student
    const pipeline = [
      {
        $match: {
          class: new mongoose.Types.ObjectId(classId),
          academicYear: new mongoose.Types.ObjectId(academicYearId),
        },
      },
      { $unwind: "$records" },
      {
        $group: {
          _id: "$records.student",
          totalDays: { $sum: 1 },
          presentDays: {
            $sum: { $cond: [{ $eq: ["$records.status", "Present"] }, 1, 0] },
          },
          lateDays: {
            $sum: { $cond: [{ $eq: ["$records.status", "Late"] }, 1, 0] },
          },
          absentDays: {
            $sum: { $cond: [{ $eq: ["$records.status", "Absent"] }, 1, 0] },
          },
          excusedDays: {
            $sum: { $cond: [{ $eq: ["$records.status", "Excused"] }, 1, 0] },
          },
        },
      },
      {
        $addFields: {
          attendanceRate: {
            $cond: [
              { $gt: ["$totalDays", 0] },
              {
                $round: [
                  {
                    $multiply: [
                      {
                        $divide: [
                          { $add: ["$presentDays", "$lateDays"] },
                          "$totalDays",
                        ],
                      },
                      100,
                    ],
                  },
                  1,
                ],
              },
              0,
            ],
          },
        },
      },
    ];

    const aggregated = await Attendance.aggregate(pipeline);

    // Fetch all students in the class (to include those with no records yet)
    const allStudents = await User.find({
      role: "student",
      studentClass: classId,
    })
      .select("name email")
      .lean();

    // Merge aggregated stats with student info
    const studentMap = new Map(
      aggregated.map((s) => [s._id.toString(), s])
    );

    const result = allStudents.map((student) => {
      const sid = (student._id as mongoose.Types.ObjectId).toString();
      const stats = studentMap.get(sid);
      return {
        studentId: sid,
        name: student.name,
        email: student.email,
        totalDays: stats?.totalDays ?? 0,
        presentDays: stats?.presentDays ?? 0,
        lateDays: stats?.lateDays ?? 0,
        absentDays: stats?.absentDays ?? 0,
        excusedDays: stats?.excusedDays ?? 0,
        attendanceRate: stats?.attendanceRate ?? 0,
      };
    });

    // Sort by name
    result.sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({ students: result });
  } catch (error) {
    console.error("ATTENDANCE SESSION ERROR", error);
    return NextResponse.json({ message: "Server Error", error }, { status: 500 });
  }
}
