import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getAuthUser } from "@/middleware/auth";
import School from "@/lib/models/school";
import Subscription from "@/lib/models/subscription";
import Plan from "@/lib/models/plan";
import axios from "axios";

// POST /api/billing/initialize — Start a Paystack payment session
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const authUser = await getAuthUser(req, ["admin"]);
    if (!authUser) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const { planSlug } = await req.json();

    const plan = await Plan.findOne({ slug: planSlug, isActive: true });
    if (!plan) return NextResponse.json({ message: "Plan not found" }, { status: 404 });

    const school = authUser.schoolContext!;
    const amount = plan.monthlyPriceKobo; // already in kobo

    // Initialize Paystack transaction
    const paystackRes = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      {
        email: school.email,
        amount, // kobo
        currency: "NGN",
        metadata: {
          schoolId: school._id.toString(),
          planSlug: plan.slug,
          planId: plan._id.toString(),
        },
        callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/${school.slug}/billing?status=callback`,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    return NextResponse.json({
      authorizationUrl: paystackRes.data.data.authorization_url,
      reference: paystackRes.data.data.reference,
    });
  } catch (error: any) {
    console.error("Paystack init error:", error?.response?.data || error);
    return NextResponse.json({ message: "Payment initialization failed" }, { status: 500 });
  }
}
