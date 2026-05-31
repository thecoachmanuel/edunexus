import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getSuperAuthUser } from "@/middleware/superAuth";
import Plan from "@/lib/models/plan";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    const superAdmin = await getSuperAuthUser(req);
    if (!superAdmin) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const plan = await Plan.findByIdAndUpdate(params.id, body, { new: true });
    
    if (!plan) return NextResponse.json({ message: "Plan not found" }, { status: 404 });
    return NextResponse.json({ message: "Plan updated successfully", plan });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    const superAdmin = await getSuperAuthUser(req);
    if (!superAdmin) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    // We don't hard delete, we just set isActive to false
    const plan = await Plan.findByIdAndUpdate(params.id, { isActive: false }, { new: true });
    
    if (!plan) return NextResponse.json({ message: "Plan not found" }, { status: 404 });
    return NextResponse.json({ message: "Plan deactivated successfully" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
