import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Task } from "@/lib/models/task";
import { getAuthUser } from "@/middleware/auth";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    await connectDB();
    // Admin sees all tasks, teachers/others see tasks assigned to them or created by them
    let query: any = {};
    if (user.role !== "admin") {
      query = { $or: [{ assignee: user._id }, { createdBy: user._id }] };
    }

    const tasks = await Task.find(query)
      .populate("assignee", "name email")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    return NextResponse.json({ tasks });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    await connectDB();
    const body = await req.json();

    const task = await Task.create({
      ...body,
      createdBy: user._id,
    });

    return NextResponse.json({ task, message: "Task created successfully" }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
