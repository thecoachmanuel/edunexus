import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import School from "@/lib/models/school";
import Subscription from "@/lib/models/subscription";
import { sendEmail } from "@/lib/email";

// GET /api/cron/check-trials (Triggered by Vercel Cron)
export async function GET(req: Request) {
  try {
    // Verify cron secret
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    await connectDB();
    const now = new Date();
    
    // Find schools whose trials have expired but are still marked as active trial
    const expiredSchools = await School.find({
      isTrialActive: true,
      trialEndsAt: { $lt: now },
    });

    for (const school of expiredSchools) {
      school.isTrialActive = false;
      school.isActive = false; // Auto-suspend until they subscribe
      await school.save();

      if (school.subscription) {
        await Subscription.findByIdAndUpdate(school.subscription, {
          status: "past_due",
        });
      }

      await sendEmail({
        to: school.email,
        subject: "Your EduNexus Free Trial Has Ended",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #4f46e5;">Trial Expired</h1>
            <p>Hi ${school.name},</p>
            <p>Your 14-day free trial of EduNexus has ended. Your portal is temporarily suspended.</p>
            <p>To continue using EduNexus and keep your school running smoothly, please upgrade to a paid plan:</p>
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/${school.slug}/billing" style="display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin: 16px 0;">Upgrade Now</a>
            <p style="color: #6b7280; font-size: 14px;">If you need an extension or have questions, please reply to this email.</p>
          </div>
        `,
      });
    }

    return NextResponse.json({ success: true, processed: expiredSchools.length });
  } catch (error) {
    console.error("Cron error:", error);
    return NextResponse.json({ success: false, error }, { status: 500 });
  }
}
