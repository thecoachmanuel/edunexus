export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Class from "@/lib/models/class";
import { getAuthUser } from "@/middleware/auth";

// PUT /api/classes/[id]
export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    await connectDB();
    const authUser = await getAuthUser(req, ["admin"]);
    if (!authUser) return NextResponse.json({ message: "Not authorized" }, { status: 401 });

    const body = await req.json();
    const updatedClass = await Class.findByIdAndUpdate(params.id, body, {
      new: true,
      runValidators: true,
    });
    if (!updatedClass) return NextResponse.json({ message: "Class not found" }, { status: 404 });
    return NextResponse.json(updatedClass);
  } catch (error) {
    return NextResponse.json({ message: "Server Error", error }, { status: 500 });
  }
}

// DELETE /api/classes/[id]
export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    await connectDB();
    const authUser = await getAuthUser(req, ["admin"]);
    if (!authUser) return NextResponse.json({ message: "Not authorized" }, { status: 401 });

    const deletedClass = await Class.findByIdAndDelete(params.id);
    if (!deletedClass) return NextResponse.json({ message: "Class not found" }, { status: 404 });
    return NextResponse.json({ message: "Class removed" });
  } catch (error) {
    return NextResponse.json({ message: "Server Error", error }, { status: 500 });
  }
}
