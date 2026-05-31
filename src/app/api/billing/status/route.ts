import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getAuthUser } from "@/middleware/auth";
import Subscription from "@/lib/models/subscription";
import SaaSTransaction from "@/lib/models/saasTransaction";

// GET /api/billing/status — Returns the current school's subscription status
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const authUser = await getAuthUser(req, ["admin"]);
    if (!authUser) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const school = authUser.schoolContext!;
    const subscription = authUser.subscriptionContext;

    let invoices: any[] = [];
    if (subscription) {
      invoices = await SaaSTransaction.find({ school: school._id })
        .sort({ createdAt: -1 })
        .limit(12)
        .lean();
    }

    return NextResponse.json({
      school: {
        name: school.name,
        slug: school.slug,
        isTrialActive: school.isTrialActive,
        trialEndsAt: school.trialEndsAt,
      },
      subscription: subscription
        ? {
            status: subscription.status,
            currentPeriodEnd: subscription.currentPeriodEnd,
            plan: (subscription as any).plan,
          }
        : null,
      invoices,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
