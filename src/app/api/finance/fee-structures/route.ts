export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import FeeStructure from "@/lib/models/feeStructure";
import Class from "@/lib/models/class";
import AcademicYear from "@/lib/models/academicYear";
import { getAuthUser } from "@/middleware/auth";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const authUser = await getAuthUser(req, ["admin"]);
    if (!authUser) return NextResponse.json({ message: "Not authorized" }, { status: 401 });

    const feeStructures = await FeeStructure.find({})
      .populate("class", "name")
      .populate("academicYear", "name")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ feeStructures });
  } catch (error) {
    return NextResponse.json({ message: "Server Error", error }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const authUser = await getAuthUser(req, ["admin"]);
    if (!authUser) return NextResponse.json({ message: "Not authorized" }, { status: 401 });

    const data = await req.json();
    const feeStructure = await FeeStructure.create(data);

    return NextResponse.json(feeStructure, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: "Server Error", error }, { status: 500 });
  }
}