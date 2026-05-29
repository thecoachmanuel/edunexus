export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/lib/models/user";
import jwt from "jsonwebtoken";

export async function POST(req: Request) {
  try {
    await connectDB();
    const { email, password } = await req.json();
    let user = await User.findOne({ email });

    let isAuthorized = false;

    // Admin Env Override
    if (
      process.env.ADMIN_EMAIL &&
      process.env.ADMIN_PASSWORD &&
      email === process.env.ADMIN_EMAIL &&
      password === process.env.ADMIN_PASSWORD
    ) {
      if (!user) {
        user = await User.create({
          name: "Super Admin",
          email: process.env.ADMIN_EMAIL,
          password: process.env.ADMIN_PASSWORD,
          role: "admin",
          isActive: true,
        });
      } else if (user.role !== "admin") {
        user.role = "admin";
        await user.save();
      }
      isAuthorized = true;
    } else {
      // Normal DB Check
      if (user && (await user.matchPassword(password))) {
        isAuthorized = true;
      }
    }

    if (isAuthorized && user) {
      const token = jwt.sign(
        { userId: user.id.toString() },
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
        maxAge: 30 * 24 * 60 * 60, // 30 days in seconds
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
    return NextResponse.json({ message: "Server Error", error }, { status: 500 });
  }
}
