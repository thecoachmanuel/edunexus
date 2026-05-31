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

      // Check if transaction was already processed
      const existingTx = await SaaSTransaction.findOne({ reference: data.reference });
      if (existingTx && existingTx.status === "success") {
         return NextResponse.json({ status: "already processed" }, { status: 200 });
      }

      const school = await School.findById(metadata.schoolId);
      if (!school) return NextResponse.json({ status: "school not found" }, { status: 200 });

      // Calculate next period
      const nextPaymentDate = new Date();
      nextPaymentDate.setDate(nextPaymentDate.getDate() + 30); // 30 days

      let sub = await Subscription.findOne({ school: school._id });
      if (!sub) {
         sub = await Subscription.create({
            school: school._id,
            plan: metadata.planId,
            status: "active",
            currentPeriodStart: new Date(),
            currentPeriodEnd: nextPaymentDate,
            nextPaymentDate,
            paystackCustomerCode: data.customer?.customer_code,
            paystackAuthorizationCode: data.authorization?.authorization_code,
            renewalCount: 0
         });
         school.subscription = sub._id;
      } else {
         sub.status = "active";
         sub.plan = metadata.planId;
         sub.currentPeriodStart = new Date();
         sub.currentPeriodEnd = nextPaymentDate;
         sub.nextPaymentDate = nextPaymentDate;
         sub.paystackCustomerCode = data.customer?.customer_code || sub.paystackCustomerCode;
         sub.paystackAuthorizationCode = data.authorization?.authorization_code || sub.paystackAuthorizationCode;
         sub.renewalCount += 1;
         await sub.save();
      }

      school.isTrialActive = false;
      school.isActive = true;
      await school.save();

      // Log transaction
      await SaaSTransaction.create({
        school: school._id,
        subscription: sub._id,
        amountKobo: data.amount,
        currency: data.currency || "NGN",
        reference: data.reference,
        status: "success",
        type: sub.renewalCount === 0 ? "new_subscription" : "renewal",
        description: `Payment for plan ${metadata.planSlug || 'Subscription'}`,
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
