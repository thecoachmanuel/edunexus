import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Subscription from "@/lib/models/subscription";
import School from "@/lib/models/school";
import User from "@/lib/models/user";
import { sendEmail } from "@/lib/email";

// GET /api/cron/subscription-reminders (Called daily by Vercel Cron or cron-job.org)
export async function GET(req: Request) {
  try {
    // Verify cron secret
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    await connectDB();
    const now = new Date();
    const emailsSent: string[] = [];

    // ── REMINDER WINDOWS ─────────────────────────────────────────────────────
    // Send reminder emails 7 days, 3 days, and 1 day before expiry.
    const reminderDays = [7, 3, 1];

    for (const days of reminderDays) {
      // Target: subscriptions expiring in exactly `days` days (within a 24h window)
      const windowStart = new Date(now);
      windowStart.setDate(windowStart.getDate() + days);
      windowStart.setHours(0, 0, 0, 0);

      const windowEnd = new Date(windowStart);
      windowEnd.setHours(23, 59, 59, 999);

      const expiringSubs = await Subscription.find({
        status: "active",
        currentPeriodEnd: { $gte: windowStart, $lte: windowEnd },
      }).populate("plan", "name");

      for (const sub of expiringSubs) {
        const school = await School.findById(sub.school);
        if (!school) continue;

        // Find the admin of the school
        const admin = await User.findOne({ school: school._id, role: "admin" }).select("name email");
        const recipientEmail = admin?.email || school.email;
        if (!recipientEmail) continue;

        const planName = (sub as any).plan?.name || "your current plan";
        const expiryDate = new Date(sub.currentPeriodEnd!).toLocaleDateString("en-GB", {
          weekday: "long", year: "numeric", month: "long", day: "numeric"
        });

        const urgencyColor = days === 1 ? "#ef4444" : days === 3 ? "#f59e0b" : "#4f46e5";
        const urgencyText = days === 1 ? "⚠️ URGENT: " : "";

        await sendEmail({
          to: recipientEmail,
          subject: `${urgencyText}Your EduNexus subscription expires in ${days} day${days > 1 ? "s" : ""}`,
          html: `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fafafa; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
              
              <div style="background: ${urgencyColor}; padding: 32px 40px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 800;">
                  ${days === 1 ? "⚠️" : days === 3 ? "🕐" : "📅"} Subscription Expiring in ${days} Day${days > 1 ? "s" : ""}
                </h1>
              </div>

              <div style="padding: 32px 40px;">
                <p style="color: #374151; font-size: 16px;">Hi ${admin?.name || school.name},</p>
                
                <p style="color: #6b7280;">
                  This is a reminder that your <strong>${planName}</strong> subscription for 
                  <strong>${school.name}</strong> will expire on <strong>${expiryDate}</strong>.
                </p>

                <div style="background: ${urgencyColor}15; border: 1px solid ${urgencyColor}30; border-radius: 8px; padding: 16px 20px; margin: 24px 0;">
                  <p style="margin: 0; color: ${urgencyColor}; font-weight: 700; font-size: 15px;">
                    🏫 School: ${school.name}
                  </p>
                  <p style="margin: 8px 0 0; color: #6b7280; font-size: 14px;">
                    📅 Expiry Date: ${expiryDate}
                  </p>
                  <p style="margin: 4px 0 0; color: #6b7280; font-size: 14px;">
                    📦 Current Plan: ${planName}
                  </p>
                </div>

                <p style="color: #6b7280;">
                  When your subscription expires, your school staff and students will lose access to the platform. 
                  <strong>Renew now</strong> to avoid any interruption — you can even add multiple months at once!
                </p>

                <div style="text-align: center; margin: 32px 0;">
                  <a href="${process.env.NEXT_PUBLIC_APP_URL}/${school.slug}/billing" 
                     style="display: inline-block; background: ${urgencyColor}; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 16px;">
                    Renew Subscription Now →
                  </a>
                </div>

                <p style="color: #9ca3af; font-size: 13px; text-align: center;">
                  If you have any questions, please contact our support team. We're happy to help!
                </p>
              </div>

              <div style="background: #f3f4f6; padding: 16px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
                <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                  EduNexus · School Management Platform<br/>
                  You received this email because you are the admin of ${school.name}.
                </p>
              </div>
            </div>
          `,
        });

        emailsSent.push(`${school.name} (${days}d notice)`);
      }
    }

    // ── ALSO: Handle subscriptions that expired today and still show as "active" ─
    const expiredSubs = await Subscription.find({
      status: "active",
      currentPeriodEnd: { $lt: now },
    });

    let suspendedCount = 0;
    for (const sub of expiredSubs) {
      sub.status = "expired";
      await sub.save();

      const school = await School.findById(sub.school);
      if (school) {
        school.isActive = false;
        await school.save();

        const admin = await User.findOne({ school: school._id, role: "admin" }).select("name email");
        const recipientEmail = admin?.email || school.email;

        if (recipientEmail) {
          await sendEmail({
            to: recipientEmail,
            subject: `Your EduNexus subscription has expired — ${school.name}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fafafa; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
                <div style="background: #ef4444; padding: 32px 40px; text-align: center;">
                  <h1 style="color: white; margin: 0; font-size: 24px;">🔒 Subscription Expired</h1>
                </div>
                <div style="padding: 32px 40px;">
                  <p>Hi ${admin?.name || school.name},</p>
                  <p style="color: #6b7280;">Your subscription for <strong>${school.name}</strong> has expired. Your school portal has been temporarily suspended.</p>
                  <div style="text-align: center; margin: 32px 0;">
                    <a href="${process.env.NEXT_PUBLIC_APP_URL}/${school.slug}/billing" 
                       style="display: inline-block; background: #ef4444; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 700;">
                      Renew Now to Restore Access
                    </a>
                  </div>
                </div>
              </div>
            `,
          });
          emailsSent.push(`${school.name} (expired)`);
        }
      }
      suspendedCount++;
    }

    return NextResponse.json({
      success: true,
      emailsSent,
      suspended: suspendedCount,
    });
  } catch (error) {
    console.error("Subscription reminders cron error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
