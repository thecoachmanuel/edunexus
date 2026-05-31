import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import School from "@/lib/models/school";
import Plan from "@/lib/models/plan";
import Subscription from "@/lib/models/subscription";
import User from "@/lib/models/user";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { sendEmail } from "@/lib/email";

export async function POST(req: Request) {
  try {
    await connectDB();
    const { schoolName, slug, email, adminName, adminPassword, planSlug } = await req.json();

    // Validate slug format
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return NextResponse.json({ message: "Slug can only contain lowercase letters, numbers, and hyphens." }, { status: 400 });
    }

    // Check uniqueness
    const [existingSchool, existingSlug] = await Promise.all([
      School.findOne({ email }),
      School.findOne({ slug }),
    ]);

    if (existingSchool) return NextResponse.json({ message: "An account with this email already exists." }, { status: 409 });
    if (existingSlug) return NextResponse.json({ message: "This URL slug is already taken. Please choose another." }, { status: 409 });

    // Find plan
    const plan = await Plan.findOne({ slug: planSlug || "starter", isActive: true });
    if (!plan) return NextResponse.json({ message: "Selected plan not found." }, { status: 400 });

    // Create email verification token
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Calculate trial end date
    const trialEndsAt = plan.trialAllowed
      ? new Date(Date.now() + plan.trialDays * 24 * 60 * 60 * 1000)
      : undefined;

    // Create the school
    const school = await School.create({
      name: schoolName,
      slug,
      email,
      isActive: true,
      isVerified: false,
      verificationToken,
      verificationExpiry,
      onboardingCompleted: false,
      isTrialActive: plan.trialAllowed,
      trialEndsAt,
    });

    // Create subscription (trialing if plan allows, else pending)
    const subscription = await Subscription.create({
      school: school._id,
      plan: plan._id,
      status: plan.trialAllowed ? "trialing" : "active",
      currentPeriodStart: new Date(),
      currentPeriodEnd: trialEndsAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    // Link subscription to school
    school.subscription = subscription._id as any;
    await school.save();

    // Create admin user
    await User.create({
      school: school._id,
      name: adminName,
      email,
      password: adminPassword,
      role: "admin",
      isActive: true,
    });

    // Send verification email
    const verifyUrl = `${process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL}/verify-email?token=${verificationToken}&school=${school._id}`;
    await sendEmail({
      to: email,
      subject: "Welcome to EduNexus — Verify Your Email",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #4f46e5;">Welcome to EduNexus, ${adminName}! 🎉</h1>
          <p>Your school <strong>${schoolName}</strong> has been successfully registered.</p>
          <p>Please verify your email to activate your account:</p>
          <a href="${verifyUrl}" style="display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin: 16px 0;">Verify Email & Activate Account</a>
          <p>Your school portal: <a href="${process.env.NEXT_PUBLIC_APP_URL}/${slug}/login">${process.env.NEXT_PUBLIC_APP_URL}/${slug}/login</a></p>
          ${plan.trialAllowed ? `<p>✅ Your <strong>${plan.trialDays}-day free trial</strong> starts now — no credit card required.</p>` : ""}
          <p style="color: #6b7280; font-size: 14px;">This link expires in 24 hours.</p>
        </div>
      `,
    });

    return NextResponse.json({
      message: "School registered successfully! Please check your email to verify your account.",
      slug,
    }, { status: 201 });
  } catch (error: any) {
    console.error("School registration error:", error);
    return NextResponse.json({ message: "Server error. Please try again.", error: error?.message }, { status: 500 });
  }
}
