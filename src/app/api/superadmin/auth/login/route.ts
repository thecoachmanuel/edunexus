import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import SuperAdmin from "@/lib/models/superAdmin";
import jwt from "jsonwebtoken";

// POST /api/superadmin/auth/login
export async function POST(req: Request) {
  try {
    await connectDB();
    const { email, password } = await req.json();

    const envEmail = process.env.ADMIN_EMAIL;
    const envPassword = process.env.ADMIN_PASSWORD;

    let admin;

    // First check against environment variables (Source of truth)
    if (envEmail && envPassword && email === envEmail && password === envPassword) {
      admin = await SuperAdmin.findOne({ email: envEmail });
      if (!admin) {
        admin = await SuperAdmin.create({
          name: "EduNexus Super Admin",
          email: envEmail,
          password: "managed-by-env", 
          role: "super_admin",
          isActive: true,
        });
      } else {
        admin.lastLoginAt = new Date();
        await admin.save();
      }
    } else {
      // Fallback to database check
      admin = await SuperAdmin.findOne({ email, isActive: true });
      if (!admin || !(await admin.matchPassword(password))) {
        return NextResponse.json({ message: "Invalid credentials" }, { status: 401 });
      }
      admin.lastLoginAt = new Date();
      await admin.save();
    }

    const token = jwt.sign(
      { adminId: admin._id.toString(), role: admin.role },
      process.env.SUPER_ADMIN_JWT_SECRET as string,
      { expiresIn: "8h", algorithm: "HS512" }
    );

    const response = NextResponse.json({
      message: "Logged in",
      admin: { id: admin._id, name: admin.name, email: admin.email, role: admin.role },
    });

    response.cookies.set({
      name: "saas_admin_jwt",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 8 * 60 * 60, // 8 hours
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Super Admin Login Error:", error);
    return NextResponse.json({ message: error instanceof Error ? error.message : "Server error" }, { status: 500 });
  }
}
