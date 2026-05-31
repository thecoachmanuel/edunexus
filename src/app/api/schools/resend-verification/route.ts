import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import School from "@/lib/models/school";
import crypto from "crypto";
import { sendEmail } from "@/lib/email";

export async function POST(req: Request) {
  try {
    await connectDB();
    const { slug } = await req.json();

    if (!slug) {
      return NextResponse.json({ message: "School slug is required." }, { status: 400 });
    }

    const school = await School.findOne({ slug });
    if (!school) {
      return NextResponse.json({ message: "School not found." }, { status: 404 });
    }

    if (school.isVerified) {
      return NextResponse.json({ message: "This school email is already verified. You can log in normally." }, { status: 400 });
    }

    // Generate a fresh token
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    school.verificationToken = verificationToken;
    school.verificationExpiry = verificationExpiry;
    await school.save();

    const verifyUrl = `${process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL}/verify-email?token=${verificationToken}&school=${school._id}`;

    await sendEmail({
      to: school.email,
      subject: "EduNexus — Email Verification (Resent)",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #7c3aed;">Verify Your EduNexus Account</h1>
          <p>You requested a new verification link for <strong>${school.name}</strong>.</p>
          <p>Please click the button below to verify your email and activate your account:</p>
          <a href="${verifyUrl}" style="display: inline-block; background: #7c3aed; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin: 16px 0;">Verify Email & Activate Account</a>
          <p>Your school login page: <a href="${process.env.NEXT_PUBLIC_APP_URL}/${school.slug}/login">${process.env.NEXT_PUBLIC_APP_URL}/${school.slug}/login</a></p>
          <p style="color: #6b7280; font-size: 14px;">This link expires in 24 hours. If you did not request this, you can ignore this email.</p>
        </div>
      `,
    });

    return NextResponse.json({ message: "Verification email resent successfully. Please check your inbox and spam folder." });
  } catch (error: any) {
    console.error("Resend verification error:", error);
    return NextResponse.json({ message: "Server error. Please try again." }, { status: 500 });
  }
}
