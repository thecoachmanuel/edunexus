export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/lib/models/user";
import Class from "@/lib/models/class";
import Subject from "@/lib/models/subject";
import jwt from "jsonwebtoken";
import { logActivity } from "@/lib/utils/activitieslog"; // I will move it to lib/utils

const protectAdmin = async (req: NextRequest) => {
  const token = req.cookies.get("jwt")?.value;
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { userId: string };
    const user = await User.findById(decoded.userId).select("-password").lean();
    if (user && (user.role === "admin" || user.role === "teacher")) return user;
  } catch (e) {}
  return null;
};

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const adminUser = await protectAdmin(req);
    if (!adminUser) return NextResponse.json({ message: "Not authorized" }, { status: 401 });

    const searchParams = req.nextUrl.searchParams;
    const pageParam = searchParams.get("page");
    const limitParam = searchParams.get("limit");
    
    const page = pageParam ? parseInt(pageParam) : 1;
    const limit = limitParam ? parseInt(limitParam) : (pageParam ? 10 : 10000);
    const role = searchParams.get("role");
    const search = searchParams.get("search");

    const skip = (page - 1) * limit;
    const filter: any = {};

    if (role && role !== "all" && role !== "") {
      filter.role = role;
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const [total, users] = await Promise.all([
      User.countDocuments(filter),
      User.find(filter)
        .select("-password")
        .populate("studentClass", "name")
        .populate("teacherSubject", "name")
        .populate("children", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    return NextResponse.json({
      users,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit,
      },
    });
  } catch (error) {
    console.log("USERS API ERROR:", error);
    return NextResponse.json({ message: "Server Error", error }, { status: 500 });
  }
}
