export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/lib/models/user";
import School from "@/lib/models/school";
import jwt from "jsonwebtoken";

export async function POST(req: Request) {
  try {
    await connectDB();
    const { email, password, slug } = await req.json();

    // Find school by slug to scope the login
    let schoolId: string | undefined;
    if (slug) {
      const school = await School.findOne({ slug, isActive: true });
      if (!school) {
        return NextResponse.json({ message: "School not found or inactive." }, { status: 404 });
      }
      schoolId = school._id.toString();
    }

    // Find user — scoped by school if slug provided
    let user = await User.findOne(schoolId ? { email, school: schoolId } : { email });

    let isAuthorized = false;

    // Admin Env Override (legacy for initial setup)
    if (
      process.env.ADMIN_EMAIL &&
      process.env.ADMIN_PASSWORD &&
      email === process.env.ADMIN_EMAIL &&
      password === process.env.ADMIN_PASSWORD
    ) {
      if (!user) {
        const anySchool = schoolId || (await School.findOne())?._id.toString();
        if (anySchool) {
          user = await User.create({
            school: anySchool,
            name: "Admin",
            email: process.env.ADMIN_EMAIL,
            password: process.env.ADMIN_PASSWORD,
            role: "admin",
            isActive: true,
          });
        }
      } else if (user.role !== "admin") {
        user.role = "admin";
        await user.save();
      }
      isAuthorized = true;
    } else {
      if (user && (await user.matchPassword(password))) {
        isAuthorized = true;
      }
    }

    if (isAuthorized && user) {
      const token = jwt.sign(
        {
          userId: user.id.toString(),
          schoolId: user.school?.toString(),
        },
        process.env.JWT_SECRET as string,
        { expiresIn: "30d", algorithm: "HS512" }
      );

      const response = NextResponse.json(user);
      response.cookies.set({
        name: "jwt",
        value: token,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 30 * 24 * 60 * 60,
        path: "/",
      });

      return response;
    } else {
      return NextResponse.json(
        { message: "Invalid email or password" },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ message: "Server Error", error }, { status: 500 });
  }
}
