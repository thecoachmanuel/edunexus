import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { connectDB } from "@/lib/db";
import School from "@/lib/models/school";
import Subscription from "@/lib/models/subscription";
import SaaSTransaction from "@/lib/models/saasTransaction";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const hash = crypto
      .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY as string)
      .update(rawBody)
      .digest("hex");

    const signature = req.headers.get("x-paystack-signature");
    if (hash !== signature) {
      return NextResponse.json({ message: "Invalid signature" }, { status: 400 });
    }

    const event = JSON.parse(rawBody);
    await connectDB();

    if (event.event === "charge.success") {
      const data = event.data;
      const metadata = data.metadata;

      if (!metadata || !metadata.schoolId) {
        return NextResponse.json({ status: "ignored - no metadata" }, { status: 200 });
      }

      // Idempotency check — prevent double-processing
      const existingTx = await SaaSTransaction.findOne({ reference: data.reference });
      if (existingTx && existingTx.status === "success") {
        return NextResponse.json({ status: "already processed" }, { status: 200 });
      }

      const school = await School.findById(metadata.schoolId);
      if (!school) return NextResponse.json({ status: "school not found" }, { status: 200 });

      // ── STACKING LOGIC ───────────────────────────────────────────────────────
      // daysToAdd comes from metadata (calculated at initialization time).
      // If daysToAdd is missing (old transactions), fall back to quantity * cycle days.
      const cycle: "monthly" | "annual" = metadata.cycle || "monthly";
      const quantity: number = Number(metadata.quantity) || 1;
      const daysToAdd: number =
        Number(metadata.daysToAdd) ||
        (cycle === "annual" ? quantity * 365 : quantity * 30);

      // Find the school's current subscription
      let sub = await Subscription.findOne({ school: school._id });

      // Calculate the new period end by STACKING on top of existing time
      const now = new Date();
      let newPeriodEnd: Date;

      if (sub && sub.currentPeriodEnd && sub.currentPeriodEnd > now) {
        // Still has time left — stack on top of existing end date
        newPeriodEnd = new Date(sub.currentPeriodEnd);
      } else {
        // Expired or no sub — start fresh from today
        newPeriodEnd = new Date(now);
      }
      newPeriodEnd.setDate(newPeriodEnd.getDate() + daysToAdd);

      if (!sub) {
        sub = await Subscription.create({
          school: school._id,
          plan: metadata.planId,
          status: "active",
          currentPeriodStart: now,
          currentPeriodEnd: newPeriodEnd,
          nextPaymentDate: newPeriodEnd,
          paystackCustomerCode: data.customer?.customer_code,
          paystackAuthorizationCode: data.authorization?.authorization_code,
          renewalCount: 0,
        });
        school.subscription = sub._id;
      } else {
        sub.status = "active";
        sub.plan = metadata.planId;
        sub.currentPeriodStart = sub.currentPeriodEnd && sub.currentPeriodEnd > now ? sub.currentPeriodStart : now;
        sub.currentPeriodEnd = newPeriodEnd;
        sub.nextPaymentDate = newPeriodEnd;
        sub.paystackCustomerCode = data.customer?.customer_code || sub.paystackCustomerCode;
        sub.paystackAuthorizationCode = data.authorization?.authorization_code || sub.paystackAuthorizationCode;
        sub.renewalCount = (sub.renewalCount || 0) + 1;
        await sub.save();
      }

      school.isTrialActive = false;
      school.isActive = true;
      await school.save();

      // Log the transaction
      const isFirstPayment = !sub || sub.renewalCount === 0;
      const cycleLabel = cycle === "annual"
        ? `${quantity} Year${quantity > 1 ? "s" : ""}`
        : `${quantity} Month${quantity > 1 ? "s" : ""}`;

      await SaaSTransaction.create({
        school: school._id,
        subscription: sub._id,
        amountKobo: data.amount,
        currency: data.currency || "NGN",
        reference: data.reference,
        status: "success",
        type: isFirstPayment ? "new_subscription" : "renewal",
        description: `${cycleLabel} - ${metadata.planSlug || "Subscription"} (${daysToAdd} days added)`,
        paystackCustomerCode: data.customer?.customer_code,
        paidAt: new Date(data.paid_at || new Date()),
      });
    }

    return NextResponse.json({ status: "success" }, { status: 200 });
  } catch (error) {
    console.error("Paystack Webhook Error:", error);
    return NextResponse.json({ message: "Webhook error" }, { status: 500 });
  }
}
