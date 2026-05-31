import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getSuperAuthUser } from "@/middleware/superAuth";
import SuperAdmin from "@/lib/models/superAdmin";

// GET /api/superadmin/users
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const currentAdmin = await getSuperAuthUser(req, ["super_admin"]);
    if (!currentAdmin) return NextResponse.json({ message: "Unauthorized. Requires super_admin role." }, { status: 401 });

    const users = await SuperAdmin.find().select("-password");
    return NextResponse.json({ users });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

// POST /api/superadmin/users
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const currentAdmin = await getSuperAuthUser(req, ["super_admin"]);
    if (!currentAdmin) return NextResponse.json({ message: "Unauthorized. Requires super_admin role." }, { status: 401 });

    const { name, email, password, role } = await req.json();

    const existing = await SuperAdmin.findOne({ email });
    if (existing) {
      return NextResponse.json({ message: "User with this email already exists" }, { status: 400 });
    }

    const user = await SuperAdmin.create({
      name,
      email,
      password,
      role: role || "support_agent",
      isActive: true,
    });

    // Remove password from response
    const userObj = user.toObject();
    delete userObj.password;

    return NextResponse.json({ message: "User created successfully", user: userObj }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
