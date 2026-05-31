import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getSuperAuthUser } from "@/middleware/superAuth";
import Plan from "@/lib/models/plan";

// GET /api/superadmin/plans
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const superAdmin = await getSuperAuthUser(req);
    if (!superAdmin) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const plans = await Plan.find().sort({ displayOrder: 1 });
    return NextResponse.json({ plans });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

// POST /api/superadmin/plans
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const superAdmin = await getSuperAuthUser(req);
    if (!superAdmin) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const existing = await Plan.findOne({ slug: body.slug });
    if (existing) {
      return NextResponse.json({ message: "Plan with this slug already exists" }, { status: 400 });
    }

    const plan = await Plan.create(body);
    return NextResponse.json({ message: "Plan created successfully", plan }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
