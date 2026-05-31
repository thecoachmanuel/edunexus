"use server";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import School from "@/lib/models/school";
import User from "@/lib/models/user";

// Simple superadmin check – expects a Bearer token with email of a superadmin user
async function checkSuperadmin(req: Request) {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return false;
  const token = auth.split(" ")[1];
  // For simplicity, token is the superadmin's email (in real app use JWT)
  const superadminEmail = token;
  await connectDB();
  const admin = await User.findOne({ email: superadminEmail, role: "superadmin" });
  return !!admin;
}

export async function GET(req: Request) {
  if (!(await checkSuperadmin(req))) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  await connectDB();
  const schools = await School.find().select("name slug email");
  return NextResponse.json({ schools });
}

export async function POST(req: Request) {
  if (!(await checkSuperadmin(req))) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const { name, slug, adminEmail, adminPassword } = await req.json();
  await connectDB();

  // Validate slug
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return NextResponse.json({ message: "Invalid slug format" }, { status: 400 });
  }
  const existing = await School.findOne({ $or: [{ slug }, { email: adminEmail }] });
  if (existing) {
    return NextResponse.json({ message: "School or admin email already exists" }, { status: 409 });
  }

  const school = await School.create({ name, slug, email: adminEmail, isActive: true, isVerified: true });
  // create admin user linked to this school
  await User.create({ school: school._id, name: "Admin", email: adminEmail, password: adminPassword, role: "admin", isActive: true });

  return NextResponse.json({ message: "School created", school: { name, slug, email: adminEmail } }, { status: 201 });
}

export async function DELETE(req: Request) {
  if (!(await checkSuperadmin(req))) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const { slug } = await req.json();
  await connectDB();
  const school = await School.findOneAndDelete({ slug });
  if (!school) {
    return NextResponse.json({ message: "School not found" }, { status: 404 });
  }
  // cascade delete users of this school
  await User.deleteMany({ school: school._id });
  return NextResponse.json({ message: "School deleted" });
}
