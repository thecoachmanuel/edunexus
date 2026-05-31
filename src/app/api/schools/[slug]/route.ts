import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import School from "@/lib/models/school";
import SchoolSettings from "@/lib/models/schoolSettings";
import Subscription from "@/lib/models/subscription";

// GET /api/schools/[slug] — Returns public school info (for login page branding)
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    await connectDB();
    const { slug } = await params;
    const school = await School.findOne({ slug, isActive: true }).select("name slug logo isVerified");
    if (!school) {
      return NextResponse.json({ message: "School not found." }, { status: 404 });
    }
    const settings = await SchoolSettings.findOne({ school: school._id }).lean();

    const responseSchool = {
      ...school.toObject(),
      name: settings?.schoolName || school.name,
      logo: settings?.schoolLogo || school.logo,
    };
    return NextResponse.json({ school: responseSchool });
  } catch (error) {
    return NextResponse.json({ message: "Server error." }, { status: 500 });
  }
}
