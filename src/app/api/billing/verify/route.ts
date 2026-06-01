import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getAuthUser } from "@/middleware/auth";
import axios from "axios";
import School from "@/lib/models/school";
import Subscription from "@/lib/models/subscription";
import SaaSTransaction from "@/lib/models/saasTransaction";
import Plan from "@/lib/models/plan";
import { sendEmail } from "@/lib/email";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const authUser = await getAuthUser(req, ["admin"]);
    if (!authUser || !authUser.schoolContext) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const reference = searchParams.get("reference");

    if (!reference) {
      return NextResponse.json({ message: "Reference is required" }, { status: 400 });
    }

    // Check if transaction already processed (idempotency check)
    const existingTx = await SaaSTransaction.findOne({ reference, status: "success" });
    if (existingTx) {
      return NextResponse.json({ message: "Transaction already processed", success: true }, { status: 200 });
    }

    // Verify with Paystack
    const paystackRes = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    const data = paystackRes.data.data;

    if (data.status === "success") {
      const { metadata, amount, customer } = data;
      const { schoolId, planId, daysToAdd } = metadata || {};

      // Only process if it belongs to the current school
      if (schoolId !== authUser.schoolContext._id.toString()) {
        return NextResponse.json({ message: "Transaction does not belong to this school" }, { status: 403 });
      }

      const school = await School.findById(schoolId).populate("subscription");
      const plan = await Plan.findById(planId);

      const actualDays = daysToAdd ? Number(daysToAdd) : 30;
      const now = new Date();

      let subscription = school.subscription
        ? await Subscription.findById(school.subscription)
        : null;

      if (subscription) {
        // If they already have an active subscription, add time to the existing end date
        const baseDate = subscription.currentPeriodEnd && subscription.currentPeriodEnd > now
          ? subscription.currentPeriodEnd
          : now;
        
        const periodEnd = new Date(baseDate.getTime() + actualDays * 24 * 60 * 60 * 1000);

        subscription.status = "active";
        subscription.plan = planId;
        subscription.currentPeriodStart = now;
        subscription.currentPeriodEnd = periodEnd;
        subscription.paystackCustomerCode = customer?.customer_code;
        subscription.renewalCount += 1;
        await subscription.save();
      } else {
        const periodEnd = new Date(now.getTime() + actualDays * 24 * 60 * 60 * 1000);
        subscription = await Subscription.create({
          school: schoolId,
          plan: planId,
          status: "active",
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          paystackCustomerCode: customer?.customer_code,
          renewalCount: 1,
        });
        school.subscription = subscription._id as any;
      }

      // Deactivate trial
      school.isTrialActive = false;
      school.trialEndsAt = undefined;
      await school.save();

      // Log SaaS Transaction
      await SaaSTransaction.create({
        school: schoolId,
        subscription: subscription._id,
        amountKobo: amount,
        currency: "NGN",
        reference,
        status: "success",
        type: subscription.renewalCount > 1 ? "renewal" : "new_subscription",
        description: `Payment for ${plan?.name || "Subscription"}`,
        paystackCustomerCode: customer?.customer_code,
        paidAt: new Date(),
      });

      // Send email
      await sendEmail({
        to: school.email,
        subject: "Payment Confirmed — EduNexus Subscription",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #4f46e5;">Payment Confirmed ✅</h1>
            <p>Your payment of <strong>₦${(amount / 100).toLocaleString()}</strong> for the <strong>${plan?.name || "EduNexus"}</strong> plan has been received.</p>
            <p>Your subscription has been extended successfully.</p>
            <p>Reference: <code>${reference}</code></p>
            <hr style="border-color: #eee; margin: 24px 0;" />
            <p style="color: #6b7280; font-size: 14px;">Thank you for choosing EduNexus. If you have questions, reply to this email or open a support ticket from your dashboard.</p>
          </div>
        `,
      });

      return NextResponse.json({ message: "Verification successful", success: true });
    } else {
      return NextResponse.json({ message: `Transaction status: ${data.status}`, success: false }, { status: 400 });
    }
  } catch (error: any) {
    console.error("Verification error:", error?.response?.data || error);
    return NextResponse.json({ message: "Verification failed" }, { status: 500 });
  }
}
