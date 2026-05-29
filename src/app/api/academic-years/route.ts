import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import AcademicYear from "@/lib/models/academicYear";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const searchParams = req.nextUrl.searchParams;
    const pageParam = searchParams.get("page");
    const limitParam = searchParams.get("limit");
    
    const page = pageParam ? parseInt(pageParam) : 1;
    const limit = limitParam ? parseInt(limitParam) : (pageParam ? 10 : 10000);
    const search = searchParams.get("search");

    const query: any = {};
    if (search) {
      query.name = { $regex: search, $options: "i" };
    }
    const [total, years] = await Promise.all([
      AcademicYear.countDocuments(query),
      AcademicYear.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
    ]);

    return NextResponse.json({
      years,
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
    const { name, fromYear, toYear, isCurrent } = await req.json();

    const existingYear = await AcademicYear.findOne({ fromYear, toYear });
    if (existingYear) {
      return NextResponse.json({ message: "Academic Year already exists" }, { status: 400 });
    }
    if (isCurrent) {
      await AcademicYear.updateMany({ _id: { $ne: null } }, { isCurrent: false });
    }
    const academicYear = await AcademicYear.create({
      name,
      fromYear,
      toYear,
      isCurrent: isCurrent || false,
    });
    return NextResponse.json(academicYear, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: "Server Error", error }, { status: 500 });
  }
}
