import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getSuperAuthUser } from "@/middleware/superAuth";
import School from "@/lib/models/school";
import Subscription from "@/lib/models/subscription";
import Plan from "@/lib/models/plan";
import User from "@/lib/models/user";
import SchoolSettings from "@/lib/models/schoolSettings";
import AcademicYear from "@/lib/models/academicYear";

// GET /api/superadmin/schools — List all schools with subscription details
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const superAdmin = await getSuperAuthUser(req);
    if (!superAdmin) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status"); // active|trialing|past_due|cancelled
    const search = searchParams.get("q") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    const schoolQuery: any = {};
    if (search) {
      schoolQuery.$or = [
        { name: { $regex: search, $options: "i" } },
        { slug: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const [schools, total] = await Promise.all([
      School.find(schoolQuery)
        .populate({
          path: "subscription",
          populate: { path: "plan", select: "name slug monthlyPriceKobo" },
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      School.countDocuments(schoolQuery),
    ]);

    // Filter by subscription status if requested
    const filtered = status
      ? schools.filter((s: any) => s.subscription?.status === status)
      : schools;

    return NextResponse.json({
      schools: filtered,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const superAdmin = await getSuperAuthUser(req, ["super_admin"]);
    if (!superAdmin) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { name, slug, adminEmail, adminPassword, planSlug, adminPhone } = body;

    if (!name || !slug || !adminEmail || !adminPassword || !planSlug) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    // Check if slug or email exists
    const existingSchool = await School.findOne({ slug });
    if (existingSchool) return NextResponse.json({ message: "Slug already in use" }, { status: 400 });

    const existingUser = await User.findOne({ email: adminEmail });
    if (existingUser) return NextResponse.json({ message: "Admin email already in use" }, { status: 400 });

    const plan = await Plan.findOne({ slug: planSlug, isActive: true });
    if (!plan) return NextResponse.json({ message: "Plan not found" }, { status: 404 });

    const school = await School.create({
      name,
      slug,
      email: adminEmail,
      phone: adminPhone || "",
      isVerified: true,
      isActive: true,
      isTrialActive: false,
    });

    const subscription = await Subscription.create({
      school: school._id,
      plan: plan._id,
      status: "active",
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days default
    });

    school.subscription = subscription._id;
    await school.save();

    await User.create({
      school: school._id,
      name: "School Admin",
      email: adminEmail,
      password: adminPassword,
      phone: adminPhone || "",
      role: "admin",
      isActive: true,
    });

    // Auto-create default SchoolSettings scoped to this school
    await SchoolSettings.create({
      school: school._id,
      schoolName: name,
      whatsappNumber: adminPhone || "",
      accountName: name,
      schoolMotto: "Excellence · Integrity · Innovation",
    });

    // Auto-create default AcademicYear so the admin can access dashboard immediately
    const today = new Date();
    const nextYr = new Date();
    nextYr.setFullYear(today.getFullYear() + 1);
    await AcademicYear.create({
      school: school._id,
      name: `${today.getFullYear()}/${nextYr.getFullYear()}`,
      fromYear: today,
      toYear: nextYr,
      isCurrent: true,
      activeTerm: "Term 1",
      terms: [
        { term: "Term 1", startDate: today, endDate: new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000) },
        { term: "Term 2", startDate: new Date(today.getTime() + 100 * 24 * 60 * 60 * 1000), endDate: new Date(today.getTime() + 190 * 24 * 60 * 60 * 1000) },
        { term: "Term 3", startDate: new Date(today.getTime() + 200 * 24 * 60 * 60 * 1000), endDate: new Date(today.getTime() + 290 * 24 * 60 * 60 * 1000) },
      ],
    });

    return NextResponse.json({ message: "School created successfully", school }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
