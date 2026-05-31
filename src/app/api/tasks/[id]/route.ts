import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Task } from "@/lib/models/task";
import { getAuthUser } from "@/middleware/auth";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    await connectDB();
    const body = await req.json();

    const resolvedParams = await params;
    const task = await Task.findOneAndUpdate(
      { _id: resolvedParams.id, school: user.schoolContext?._id },
      body,
      { new: true }
    );
    if (!task) return NextResponse.json({ message: "Task not found" }, { status: 404 });

    return NextResponse.json({ task, message: "Task updated successfully" });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    await connectDB();
    const resolvedParams = await params;
    const task = await Task.findOneAndDelete({ _id: resolvedParams.id, school: user.schoolContext?._id });
    if (!task) return NextResponse.json({ message: "Task not found" }, { status: 404 });

    return NextResponse.json({ message: "Task deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
