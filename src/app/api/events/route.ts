import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Event } from "@/lib/models/event";
import { getAuthUser } from "@/middleware/auth";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    await connectDB();
    
    // Filter events by audience if not admin
    let query: any = {};
    if (user?.schoolContext?._id) {
      query.school = user.schoolContext._id;
    }
    if (user.role !== "admin") {
      const allowedAudiences = ["All"];
      if (user.role === "teacher") allowedAudiences.push("Teachers");
      if (user.role === "student") allowedAudiences.push("Students");
      if (user.role === "parent") allowedAudiences.push("Parents");
      
      query.audience = { $in: allowedAudiences };
    }

    const events = await Event.find(query).sort({ startDate: 1 });

    return NextResponse.json({ events });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin" && user.role !== "teacher") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    await connectDB();
    const body = await req.json();

    const event = await Event.create({
      school: user.schoolContext?._id,
      ...body,
      createdBy: user._id,
    });

    return NextResponse.json({ event, message: "Event created successfully" }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
