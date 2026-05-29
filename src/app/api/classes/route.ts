export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Class from "@/lib/models/class";
import User from "@/lib/models/user";
import AcademicYear from "@/lib/models/academicYear";
import Subject from "@/lib/models/subject";
import { getAuthUser } from "@/middleware/auth";
import { logActivity } from "@/lib/utils/activitieslog";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const searchParams = req.nextUrl.searchParams;
    const pageParam = searchParams.get("page");
    const limitParam = searchParams.get("limit");
    
    const page = pageParam ? parseInt(pageParam) : 1;
    const limit = limitParam ? parseInt(limitParam) : (pageParam ? 10 : 10000);
    const search = searchParams.get("search");

    const authUser = await getAuthUser(req);
    const query: any = {};
    if (search) {
      query.name = { $regex: search, $options: "i" };
    }

    if (authUser?.role === "parent") {
      const children = await User.find({ _id: { $in: authUser.children || [] } }).select("studentClass");
      const classIds = children.map(c => c.studentClass).filter(Boolean);
      query._id = { $in: classIds };
    }

    const [total, classes] = await Promise.all([
      Class.countDocuments(query),
      Class.find(query)
        .populate("academicYear", "name")
        .populate("classTeacher", "name email")
        .populate("subjects", "name")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
    ]);

    return NextResponse.json({
      classes,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return NextResponse.json({ message: "Server Error", error }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const authUser = await getAuthUser(req, ["admin"]);
    if (!authUser) return NextResponse.json({ message: "Not authorized" }, { status: 401 });

    const { name, academicYear, classTeacher, capacity } = await req.json();

    const existingClass = await Class.findOne({ name, academicYear });
    if (existingClass) {
      return NextResponse.json(
        { message: "Class with this name already exists for the specified academic year." },
        { status: 400 }
      );
    }

    const newClass = await Class.create({
      name,
      academicYear,
      classTeacher,
      capacity,
    });
    
    await logActivity({
      userId: authUser._id.toString(),
      action: `Created Class: ${name}`,
    });

    return NextResponse.json(newClass, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: "Server Error", error }, { status: 500 });
  }
}
