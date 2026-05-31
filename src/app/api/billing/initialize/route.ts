import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getAuthUser } from "@/middleware/auth";
import School from "@/lib/models/school";
import Plan from "@/lib/models/plan";
import axios from "axios";

// POST /api/billing/initialize — Start a Paystack payment session
// Accepts: { planSlug, cycle: "monthly" | "annual", quantity: number }
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const authUser = await getAuthUser(req, ["admin"]);
    if (!authUser) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const { planSlug, cycle = "monthly", quantity = 1 } = await req.json();

    if (!planSlug) return NextResponse.json({ message: "planSlug is required" }, { status: 400 });
    if (!["monthly", "annual"].includes(cycle)) {
      return NextResponse.json({ message: "cycle must be 'monthly' or 'annual'" }, { status: 400 });
    }
    const qty = Math.max(1, Math.min(Number(quantity) || 1, 36)); // cap between 1 and 36

    const plan = await Plan.findOne({ slug: planSlug, isActive: true });
    if (!plan) return NextResponse.json({ message: "Plan not found" }, { status: 404 });

    const school = authUser.schoolContext!;

    // Calculate total amount based on cycle and quantity
    let unitPriceKobo: number;
    if (cycle === "annual") {
      unitPriceKobo = plan.annualPriceKobo ?? Math.round(plan.monthlyPriceKobo * 12 * 0.85); // 15% discount if no annual price set
    } else {
      unitPriceKobo = plan.monthlyPriceKobo;
    }
    const totalAmountKobo = unitPriceKobo * qty;

    const daysToAdd = cycle === "annual" ? qty * 365 : qty * 30;

    // Initialize Paystack transaction
    const paystackRes = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      {
        email: authUser.email,
        amount: totalAmountKobo, // kobo
        currency: "NGN",
        metadata: {
          schoolId: school._id.toString(),
          planSlug: plan.slug,
          planId: plan._id.toString(),
          cycle,
          quantity: qty,
          daysToAdd,
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
      totalAmountKobo,
      daysToAdd,
    });
  } catch (error: any) {
    console.error("Paystack init error:", error?.response?.data || error);
    return NextResponse.json({ message: "Payment initialization failed" }, { status: 500 });
  }
}
