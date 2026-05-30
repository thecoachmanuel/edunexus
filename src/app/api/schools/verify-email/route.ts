import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import School from "@/lib/models/school";

export async function GET(req: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");
    const schoolId = searchParams.get("school");

    if (!token || !schoolId) {
      return NextResponse.json({ message: "Invalid verification link." }, { status: 400 });
    }

    const school = await School.findById(schoolId);
    if (!school) return NextResponse.json({ message: "School not found." }, { status: 404 });
    if (school.isVerified) return NextResponse.json({ message: "Email already verified." }, { status: 200 });
    if (school.verificationToken !== token) return NextResponse.json({ message: "Invalid token." }, { status: 400 });
    if (school.verificationExpiry && new Date() > school.verificationExpiry) {
      return NextResponse.json({ message: "Verification link has expired. Please request a new one." }, { status: 400 });
    }

    school.isVerified = true;
    school.verificationToken = undefined;
    school.verificationExpiry = undefined;
    school.onboardingCompleted = true;
    school.onboardedAt = new Date();
    await school.save();

    return NextResponse.json({ message: "Email verified successfully! You can now log in.", slug: school.slug }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Server error." }, { status: 500 });
  }
}
