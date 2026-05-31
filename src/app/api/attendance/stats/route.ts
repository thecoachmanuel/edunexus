export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Attendance from "@/lib/models/attendance";
import { getAuthUser } from "@/middleware/auth";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const authUser = await getAuthUser(req, ["admin", "teacher", "parent", "student"]);
    if (!authUser) return NextResponse.json({ message: "Not authorized" }, { status: 401 });

    const searchParams = req.nextUrl.searchParams;
    const studentId = searchParams.get("studentId");
    const includeHistory = searchParams.get("includeHistory") === "true";

    // Security check
    let targetStudentId = studentId;
    if (authUser.role === "student") {
      targetStudentId = authUser._id.toString();
    } else if (authUser.role === "parent") {
      // Must be one of their children
      if (!studentId || !(authUser.children as any[]).map((c: any) => c.toString()).includes(studentId)) {
        return NextResponse.json({ message: "Not authorized to view this student" }, { status: 403 });
      }
    }

    if (!targetStudentId) {
      return NextResponse.json({ message: "studentId is required" }, { status: 400 });
    }

    // Find all attendance records where this student appears
    const records = await Attendance.find({ school: authUser.schoolContext?._id, "records.student": targetStudentId })
      .sort({ date: 1 })
      .lean();

    let totalDays = 0;
    let presentDays = 0;
    let lateDays = 0;
    let absentDays = 0;
    let excusedDays = 0;

    const history: { date: string; status: string; remarks: string }[] = [];

    records.forEach((record) => {
      const studentRecord = record.records.find(
        (r: any) => r.student.toString() === targetStudentId
      );
      if (studentRecord) {
        totalDays++;
        if (studentRecord.status === "Present") presentDays++;
        else if (studentRecord.status === "Late") lateDays++;
        else if (studentRecord.status === "Absent") absentDays++;
        else if (studentRecord.status === "Excused") excusedDays++;

        if (includeHistory && (authUser.role === "admin" || authUser.role === "teacher" || authUser.role === "parent" || authUser.role === "student")) {
          history.push({
            date: (record.date as Date).toISOString().split("T")[0],
            status: studentRecord.status,
            remarks: studentRecord.remarks || "",
          });
        }
      }
    });

    const presentPercentage =
      totalDays > 0 ? Math.round(((presentDays + lateDays) / totalDays) * 100) : 0;

    return NextResponse.json({
      stats: {
        totalDays,
        presentDays,
        lateDays,
        absentDays,
        excusedDays,
        presentPercentage,
      },
      ...(includeHistory ? { history } : {}),
    });
  } catch (error) {
    return NextResponse.json({ message: "Server Error", error }, { status: 500 });
  }
}
