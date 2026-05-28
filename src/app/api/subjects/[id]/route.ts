import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Subject from "@/lib/models/subject";
import User from "@/lib/models/user";
import { getAuthUser } from "@/middleware/auth";

// PUT /api/subjects/[id]
export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    await connectDB();
    
    // Auth check (admin or teacher)
    const authUser = await getAuthUser(req, ["admin", "teacher"]);
    if (!authUser) return NextResponse.json({ message: "Not authorized" }, { status: 401 });

    const { name, code, teacher, isActive } = await req.json();
    const updatedSubject = await Subject.findByIdAndUpdate(
      params.id,
      { name, code, isActive, teacher: Array.isArray(teacher) ? teacher : [] },
      { new: true, runValidators: true }
    );
    if (!updatedSubject) return NextResponse.json({ message: "Subject not found" }, { status: 404 });
    
    // Sync with User model: First remove this subject from all users, then add it to the newly assigned teachers
    await User.updateMany({ teacherSubject: params.id }, { $pull: { teacherSubject: params.id } });
    if (updatedSubject.teacher && updatedSubject.teacher.length > 0) {
      await User.updateMany(
        { _id: { $in: updatedSubject.teacher } },
        { $addToSet: { teacherSubject: updatedSubject._id } }
      );
    }
    
    return NextResponse.json(updatedSubject);
  } catch (error) {
    return NextResponse.json({ message: "Server Error", error }, { status: 500 });
  }
}

// DELETE /api/subjects/[id]
export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    await connectDB();
    const authUser = await getAuthUser(req, ["admin"]);
    if (!authUser) return NextResponse.json({ message: "Not authorized" }, { status: 401 });

    const deletedSubject = await Subject.findByIdAndDelete(params.id);
    if (!deletedSubject) return NextResponse.json({ message: "Subject not found" }, { status: 404 });
    return NextResponse.json({ message: "Subject deleted successfully" });
  } catch (error) {
    return NextResponse.json({ message: "Server Error", error }, { status: 500 });
  }
}
