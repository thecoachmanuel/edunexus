export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import AcademicYear from "@/lib/models/academicYear";
import { getAuthUser } from "@/middleware/auth";

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
    if (authUser?.schoolContext?._id) {
      query.school = authUser.schoolContext._id;
    }

    if (search) {
      query.name = { $regex: search, $options: "i" };
    }
    const [total, years] = await Promise.all([
      AcademicYear.countDocuments(query),
      AcademicYear.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
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
    const authUser = await getAuthUser(req, ["admin"]);
    if (!authUser) {
      return NextResponse.json({ message: "Not authorized" }, { status: 401 });
    }

    const { name, isCurrent, term, activeTerm, terms, fromYear: inputFromYear, toYear: inputToYear } = await req.json();

    const currentTerm = activeTerm || term || "Term 1";
    let fromYear = inputFromYear;
    let toYear = inputToYear;

    if (terms && Array.isArray(terms) && terms.length > 0) {
      fromYear = terms[0].startDate;
      toYear = terms[terms.length - 1].endDate;
    }

    const existingYear = await AcademicYear.findOne({ name, school: authUser.schoolContext?._id }).lean();
    if (existingYear) {
      return NextResponse.json({ message: "Academic Year with this name already exists" }, { status: 400 });
    }
    
    if (isCurrent) {
      await AcademicYear.updateMany({ school: authUser.schoolContext?._id }, { isCurrent: false });
    }
    
    const academicYear = await AcademicYear.create({
      school: authUser.schoolContext?._id,
      name,
      fromYear,
      toYear,
      isCurrent: isCurrent || false,
      term: currentTerm,
      activeTerm: currentTerm,
      terms: terms || [],
    });
    
    return NextResponse.json(academicYear, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: "Server Error", error }, { status: 500 });
  }
}
