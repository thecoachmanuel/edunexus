import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import AcademicYear from "@/lib/models/academicYear";

export async function GET() {
  try {
    await connectDB();
    const currentYear = await AcademicYear.findOne({ isCurrent: true });
    if (!currentYear) {
      return NextResponse.json({ message: "No current academic year found" }, { status: 404 });
    }
    return NextResponse.json(currentYear);
  } catch (error) {
    return NextResponse.json({ message: "Server Error", error }, { status: 500 });
  }
}
