import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getSuperAuthUser } from "@/middleware/superAuth";
import School from "@/lib/models/school";
import Subscription from "@/lib/models/subscription";

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
