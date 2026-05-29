export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/lib/models/user";
import Class from "@/lib/models/class";
import Attendance from "@/lib/models/attendance";
import jwt from "jsonwebtoken";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const token = req.cookies.get("jwt")?.value;
    if (!token) return NextResponse.json({ message: "Not authorized" }, { status: 401 });
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { userId: string };
    const user = await User.findById(decoded.userId);
    if (!user) return NextResponse.json({ message: "Not authorized" }, { status: 401 });

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const query: any = { date: { $gte: sevenDaysAgo } };
    
    if (user.role === "teacher") {
      const myClasses = await Class.find({ classTeacher: user._id }).select("_id").lean();
      query.class = { $in: myClasses.map(c => c._id) };
    } else if (user.role === "student") {
      query["records.student"] = user._id;
    }

    const attendances = await Attendance.find(query).sort({ date: 1 }).lean();

    // Generate last 7 days array
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      last7Days.push(d.toLocaleDateString("en-US", { weekday: 'short', month: 'short', day: 'numeric' }));
    }

    // Process data
    const chartData = last7Days.map(dateStr => {
      // Find attendances matching this date
      const dayAttendances = attendances.filter((a: any) => {
        return new Date(a.date).toLocaleDateString("en-US", { weekday: 'short', month: 'short', day: 'numeric' }) === dateStr;
      });

      if (user.role === "student") {
        let status = "No Data";
        let score = 0;
        if (dayAttendances.length > 0) {
          const rec = dayAttendances[0].records.find((r: any) => r.student.toString() === user._id.toString());
          if (rec) {
             status = rec.status;
             score = (rec.status === "Present" || rec.status === "Late") ? 100 : 0;
          }
        }
        return { name: dateStr, status, score };
      } else {
        let total = 0;
        let present = 0;
        dayAttendances.forEach((a: any) => {
          a.records.forEach((r: any) => {
            total++;
            if (r.status === "Present" || r.status === "Late") present++;
          });
        });
        const percentage = total === 0 ? 0 : Math.round((present / total) * 100);
        return { name: dateStr, percentage, totalRecords: total };
      }
    });

    return NextResponse.json(chartData);

  } catch (error) {
    console.error("Dashboard Attendance Stats Error:", error);
    return NextResponse.json({ message: "Server Error", error }, { status: 500 });
  }
}
