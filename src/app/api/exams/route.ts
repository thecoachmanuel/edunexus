import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Exam from "@/lib/models/exam";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const classId = searchParams.get("classId");
    
    let query: any = {};
    if (classId) query.class = classId;

    const [total, exams] = await Promise.all([
      Exam.countDocuments(query),
      Exam.find(query)
        .populate("class", "name")
        .populate("subject", "name code")
        .populate("teacher", "name")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
    ]);

    return NextResponse.json({ exams, pagination: { total, page, pages: Math.ceil(total / limit) } });
  } catch (error) {
    return NextResponse.json({ message: "Server Error", error }, { status: 500 });
  }
}
