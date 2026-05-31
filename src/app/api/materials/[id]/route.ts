export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Material from "@/lib/models/material";
import { getAuthUser } from "@/middleware/auth";
import { logActivity } from "@/lib/utils/activitieslog";

// PUT /api/materials/[id]
export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    await connectDB();
    const authUser = await getAuthUser(req, ["admin", "teacher"]);
    if (!authUser) return NextResponse.json({ message: "Not authorized" }, { status: 401 });

    const body = await req.json();
    const updatedMaterial = await Material.findOneAndUpdate(
      { _id: params.id, school: authUser.schoolContext?._id },
      body,
      { new: true, runValidators: true }
    );

    if (!updatedMaterial) return NextResponse.json({ message: "Material not found" }, { status: 404 });

    await logActivity({
      userId: authUser._id.toString(),
      action: "Updated Study Material",
      details: `Title: ${updatedMaterial.title}`,
    });

    return NextResponse.json(updatedMaterial);
  } catch (error) {
    return NextResponse.json({ message: "Server Error", error }, { status: 500 });
  }
}

// DELETE /api/materials/[id]
export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    await connectDB();
    const authUser = await getAuthUser(req, ["admin", "teacher"]);
    if (!authUser) return NextResponse.json({ message: "Not authorized" }, { status: 401 });

    const deletedMaterial = await Material.findOneAndDelete({ _id: params.id, school: authUser.schoolContext?._id });
    if (!deletedMaterial) return NextResponse.json({ message: "Material not found" }, { status: 404 });

    await logActivity({
      userId: authUser._id.toString(),
      action: "Deleted Study Material",
      details: `Title: ${deletedMaterial.title}`,
    });

    return NextResponse.json({ message: "Material deleted successfully" });
  } catch (error) {
    return NextResponse.json({ message: "Server Error", error }, { status: 500 });
  }
}
