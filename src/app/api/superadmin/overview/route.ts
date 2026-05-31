import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getSuperAuthUser } from "@/middleware/superAuth";
import School from "@/lib/models/school";
import Subscription from "@/lib/models/subscription";
import SaaSTransaction from "@/lib/models/saasTransaction";
import User from "@/lib/models/user";

// GET /api/superadmin/overview — Dashboard stats
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const superAdmin = await getSuperAuthUser(req);
    if (!superAdmin) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const [
      totalSchools,
      activeSchools,
      trialSchools,
      pastDueSchools,
      totalRevenue,
      totalUsers,
      recentSchools,
    ] = await Promise.all([
      School.countDocuments(),
      Subscription.countDocuments({ status: "active" }),
      Subscription.countDocuments({ status: "trialing" }),
      Subscription.countDocuments({ status: "past_due" }),
      SaaSTransaction.aggregate([
        { $match: { status: "success" } },
        { $group: { _id: null, total: { $sum: "$amountKobo" } } },
      ]),
      User.countDocuments(),
      School.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate({ path: "subscription", populate: { path: "plan", select: "name" } })
        .select("name slug email isVerified isTrialActive createdAt")
        .lean(),
    ]);

    return NextResponse.json({
      stats: {
        totalSchools,
        activeSchools,
        trialSchools,
        pastDueSchools,
        totalRevenueKobo: totalRevenue[0]?.total || 0,
        totalUsers,
      },
      recentSchools,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
