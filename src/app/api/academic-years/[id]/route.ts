export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import AcademicYear from "@/lib/models/academicYear";
import { getAuthUser } from "@/middleware/auth";

// PUT /api/academic-years/[id]
export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    await connectDB();
    const authUser = await getAuthUser(req, ["admin"]);
    if (!authUser) return NextResponse.json({ message: "Not authorized" }, { status: 401 });

    const body = await req.json();
    if (body.isCurrent) {
      await AcademicYear.updateMany({ _id: { $ne: params.id } }, { isCurrent: false });
    }
    const updatedYear = await AcademicYear.findByIdAndUpdate(params.id, body, {
      new: true,
      runValidators: true,
    });
    if (!updatedYear) return NextResponse.json({ message: "Academic Year not found" }, { status: 404 });
    return NextResponse.json(updatedYear);
  } catch (error) {
    return NextResponse.json({ message: "Server Error", error }, { status: 500 });
  }
}

// DELETE /api/academic-years/[id]
export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    await connectDB();
    const authUser = await getAuthUser(req, ["admin"]);
    if (!authUser) return NextResponse.json({ message: "Not authorized" }, { status: 401 });

    const year = await AcademicYear.findById(params.id);
    if (!year) return NextResponse.json({ message: "Academic Year not found" }, { status: 404 });
    if (year.isCurrent) {
      return NextResponse.json({ message: "Cannot delete the current academic year" }, { status: 400 });
    }
    await year.deleteOne();
    return NextResponse.json({ message: "Academic Year deleted successfully" });
  } catch (error) {
    return NextResponse.json({ message: "Server Error", error }, { status: 500 });
  }
}
