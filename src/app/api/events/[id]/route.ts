import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Event } from "@/lib/models/event";
import { getAuthUser } from "@/middleware/auth";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthUser(req);
    if (!user || (user.role !== "admin" && user.role !== "teacher")) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    await connectDB();
    const body = await req.json();

    const resolvedParams = await params;
    const event = await Event.findByIdAndUpdate(resolvedParams.id, body, { new: true });
    if (!event) return NextResponse.json({ message: "Event not found" }, { status: 404 });

    return NextResponse.json({ event, message: "Event updated successfully" });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthUser(req);
    if (!user || (user.role !== "admin" && user.role !== "teacher")) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    await connectDB();
    const resolvedParams = await params;
    const event = await Event.findByIdAndDelete(resolvedParams.id);
    if (!event) return NextResponse.json({ message: "Event not found" }, { status: 404 });

    return NextResponse.json({ message: "Event deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
