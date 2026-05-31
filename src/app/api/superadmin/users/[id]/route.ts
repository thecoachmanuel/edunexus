import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getSuperAuthUser } from "@/middleware/superAuth";
import SuperAdmin from "@/lib/models/superAdmin";

// PUT /api/superadmin/users/[id]
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await connectDB();
    const currentAdmin = await getSuperAuthUser(req, ["super_admin"]);
    if (!currentAdmin) return NextResponse.json({ message: "Unauthorized. Requires super_admin role." }, { status: 401 });

    const body = await req.json();

    // Prevent modifying the password through this route (would need a separate secure endpoint or hash it)
    if (body.password) {
      delete body.password; 
    }

    const user = await SuperAdmin.findByIdAndUpdate(id, body, { new: true }).select("-password");
    if (!user) return NextResponse.json({ message: "User not found" }, { status: 404 });

    return NextResponse.json({ message: "User updated successfully", user });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

// DELETE /api/superadmin/users/[id]
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await connectDB();
    const currentAdmin = await getSuperAuthUser(req, ["super_admin"]);
    if (!currentAdmin) return NextResponse.json({ message: "Unauthorized. Requires super_admin role." }, { status: 401 });

    if (id === currentAdmin.user._id.toString()) {
      return NextResponse.json({ message: "Cannot delete yourself" }, { status: 400 });
    }

    const user = await SuperAdmin.findByIdAndDelete(id);
    if (!user) return NextResponse.json({ message: "User not found" }, { status: 404 });

    return NextResponse.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
