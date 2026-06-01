import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import crypto from "crypto";
import School from "@/lib/models/school";
import Subscription from "@/lib/models/subscription";
import SaaSTransaction from "@/lib/models/saasTransaction";
import Plan from "@/lib/models/plan";
import { sendEmail } from "@/lib/email";

// Paystack sends webhooks for payment events
export async function POST(req: NextRequest) {
  try {
    // Verify webhook signature
    const sig = req.headers.get("x-paystack-signature");
    const rawBody = await req.text();
    const hash = crypto
      .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY!)
      .update(rawBody)
      .digest("hex");

    if (hash !== sig) {
      return NextResponse.json({ message: "Invalid signature" }, { status: 401 });
    }

    const event = JSON.parse(rawBody);
    await connectDB();

    const { event: eventType, data } = event;

    if (eventType === "charge.success") {
      const { metadata, amount, reference, customer } = data;
      const { schoolId, planId, daysToAdd } = metadata || {};

      if (!schoolId) return NextResponse.json({ message: "No schoolId in metadata" }, { status: 200 });

      const school = await School.findById(schoolId).populate("subscription");
      if (!school) return NextResponse.json({ message: "School not found" }, { status: 200 });

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
    }

    if (eventType === "subscription.disable" || eventType === "subscription.expiring_cards") {
      const { metadata } = data;
      const schoolId = metadata?.schoolId;
      if (schoolId) {
        const school = await School.findById(schoolId).populate("subscription");
        if (school?.subscription) {
          const sub = await Subscription.findById(school.subscription);
          if (sub) {
            sub.status = "past_due";
            await sub.save();
          }
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ message: "Webhook processing error" }, { status: 500 });
  }
}
