import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import subject from "@/lib/models/subject";
import User from "@/lib/models/user";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search");

    const query: any = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { code: { $regex: search, $options: "i" } },
      ];
    }
    const [total, subjects] = await Promise.all([
      subject.countDocuments(query),
      subject
        .find(query)
        .populate("teacher", "name email")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
    ]);
    return NextResponse.json({
      subjects,
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
    const { name, code, teacher, isActive } = await req.json();
    const subjectExists = await subject.findOne({ code });
    if (subjectExists) {
      return NextResponse.json({ message: "Subject code already exists" }, { status: 400 });
    }
    const newSubject = await subject.create({
      name,
      code,
      isActive,
      teacher: Array.isArray(teacher) ? teacher : [],
    });
    
    // Sync with User model
    if (newSubject.teacher && newSubject.teacher.length > 0) {
      await User.updateMany(
        { _id: { $in: newSubject.teacher } },
        { $addToSet: { teacherSubject: newSubject._id } }
      );
    }
    
    return NextResponse.json(newSubject, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: "Server Error", error }, { status: 500 });
  }
}
