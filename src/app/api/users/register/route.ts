import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/lib/models/user";
import Class from "@/lib/models/class";
import { getAuthUser } from "@/middleware/auth";
import { logActivity } from "@/utils/activitieslog";

// POST /api/users/register - Admin & Teacher only
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const authUser = await getAuthUser(req, ["admin", "teacher"]);
    if (!authUser) {
      return NextResponse.json({ message: "Not authorized" }, { status: 401 });
    }

    const { name, email, password, role, studentClass, teacherSubject, children, isActive } =
      await req.json();

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json({ message: "User already exists" }, { status: 400 });
    }

    const newUser = await User.create({
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
