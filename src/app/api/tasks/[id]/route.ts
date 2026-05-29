import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Task } from "@/lib/models/task";
import { requireAuth } from "@/lib/auth/server";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    await connectDB();
    const body = await req.json();

    const task = await Task.findByIdAndUpdate(params.id, body, { new: true });
    if (!task) return NextResponse.json({ message: "Task not found" }, { status: 404 });

    return NextResponse.json({ task, message: "Task updated successfully" });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    await connectDB();
    const task = await Task.findByIdAndDelete(params.id);
    if (!task) return NextResponse.json({ message: "Task not found" }, { status: 404 });

    return NextResponse.json({ message: "Task deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
