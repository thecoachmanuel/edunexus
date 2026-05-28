import { NextResponse, NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/lib/models/user";
import jwt from "jsonwebtoken";

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("jwt")?.value;
    if (!token) {
      return NextResponse.json({ message: "Not authorized, no token" }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { userId: string };
    await connectDB();
    const user = await User.findById(decoded.userId).select("-password");

    if (user) {
      return NextResponse.json({
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    } else {
      return NextResponse.json({ message: "Not authorized, user not found" }, { status: 401 });
    }
  } catch (error) {
    return NextResponse.json({ message: "Not authorized, token failed", error }, { status: 401 });
  }
}
