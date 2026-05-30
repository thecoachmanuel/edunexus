import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Plan from "@/lib/models/plan";

export async function GET() {
  try {
    await connectDB();
    const plans = await Plan.find({ isActive: true }).sort({ displayOrder: 1 });
    return NextResponse.json({ plans });
  } catch (error) {
    return NextResponse.json({ message: "Server error." }, { status: 500 });
  }
}
