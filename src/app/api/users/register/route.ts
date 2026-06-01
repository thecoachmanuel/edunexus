export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/lib/models/user";
import Class from "@/lib/models/class";
import { getAuthUser } from "@/middleware/auth";
import { logActivity } from "@/utils/activitieslog";
import { getSchoolFeatures } from "@/lib/utils/planEnforcer";

// POST /api/users/register - Admin only
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const authUser = await getAuthUser(req, ["admin"]);
    if (!authUser) {
      return NextResponse.json({ message: "Not authorized" }, { status: 401 });
    }

    const { name, email, password, role, studentClass, teacherSubject, children, isActive } =
      await req.json();

    if (role === "student" && authUser.schoolContext) {
      const planInfo = await getSchoolFeatures(authUser.schoolContext._id.toString());
      if (!planInfo.canAddStudent) {
        return NextResponse.json({ 
          message: `Plan limit reached. You can only have ${planInfo.maxStudents} students on the ${planInfo.planName} plan.` 
        }, { status: 403 });
      }
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json({ message: "Email is already registered to an existing user" }, { status: 400 });
    }

    const newUser = await User.create({
      school: authUser.schoolContext?._id,
      name,
      email,
      password,
      role,
      studentClass,
      teacherSubject,
      children,
      isActive,
    });

    if (studentClass) {
      await Class.findByIdAndUpdate(studentClass, {
        $addToSet: { students: newUser._id },
      });
    }

    await logActivity({
      userId: authUser._id.toString(),
      action: "Registered User",
      details: `Registered user with email: ${newUser.email}`,
    });

    return NextResponse.json(
      {
        _id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        isActive: newUser.isActive,
        message: "User registered successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json({ message: "Server Error", error }, { status: 500 });
  }
}
