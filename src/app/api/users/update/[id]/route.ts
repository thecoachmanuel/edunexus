export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/lib/models/user";
import Class from "@/lib/models/class";
import Subject from "@/lib/models/subject";
import { getAuthUser } from "@/middleware/auth";
import { logActivity } from "@/lib/utils/activitieslog";

// PUT /api/users/update/[id]
export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    await connectDB();
    const authUser = await getAuthUser(req, ["admin"]);
    if (!authUser) {
      return NextResponse.json({ message: "Not authorized" }, { status: 401 });
    }

    const user = await User.findById(params.id);
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const body = await req.json();
    user.name = body.name || user.name;
    user.email = body.email || user.email;
    user.role = body.role || user.role;
    user.isActive = body.isActive !== undefined ? body.isActive : user.isActive;
    if (body.studentClass !== undefined) {
      user.studentClass = body.studentClass;
      // Sync Class model: remove student from all classes, then add to the new one
      await Class.updateMany({ students: user._id }, { $pull: { students: user._id } });
      if (body.studentClass) {
        await Class.findByIdAndUpdate(body.studentClass, { $addToSet: { students: user._id } });
      }
    }
    if (body.teacherSubject !== undefined) {
      user.teacherSubject = body.teacherSubject;
      // Sync Subject model: remove teacher from all subjects, then add to the new ones
      await Subject.updateMany({ teacher: user._id }, { $pull: { teacher: user._id } });
      if (body.teacherSubject && body.teacherSubject.length > 0) {
        await Subject.updateMany(
          { _id: { $in: body.teacherSubject } },
          { $addToSet: { teacher: user._id } }
        );
      }
    }
    if (body.children !== undefined) {
      user.children = body.children;
    }
    if (body.password) {
      user.password = body.password;
    }

    const updatedUser = await user.save();

    await logActivity({
      userId: authUser._id.toString(),
      action: "Updated User",
      details: `Updated user with email: ${updatedUser.email}`,
    });

    return NextResponse.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      isActive: updatedUser.isActive,
      message: "User updated successfully",
    });
  } catch (error) {
    return NextResponse.json({ message: "Server Error", error }, { status: 500 });
  }
}
