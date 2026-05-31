import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getSuperAuthUser } from "@/middleware/superAuth";
import School from "@/lib/models/school";
import Subscription from "@/lib/models/subscription";
import Plan from "@/lib/models/plan";
import { sendEmail } from "@/lib/email";

// GET /api/superadmin/schools/[id] — Get one school with full details
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const superAdmin = await getSuperAuthUser(req);
    if (!superAdmin) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const school = await School.findById(id)
      .populate({ path: "subscription", populate: { path: "plan" } })
      .lean();

    if (!school) return NextResponse.json({ message: "School not found" }, { status: 404 });
    return NextResponse.json({ school });
  } catch (error) {
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

// PATCH /api/superadmin/schools/[id] — Update school (toggle active, extend trial, change plan)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const superAdmin = await getSuperAuthUser(req);
    if (!superAdmin) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const { action, planSlug, trialDays, isActive } = body;

    const school = await School.findById(id);
    if (!school) return NextResponse.json({ message: "School not found" }, { status: 404 });

    if (action === "toggle_active") {
      school.isActive = !school.isActive;
      await school.save();
      return NextResponse.json({ message: `School ${school.isActive ? "activated" : "deactivated"}`, school });
    }

    if (action === "extend_trial" && trialDays) {
      const newExpiry = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000);
      school.trialEndsAt = newExpiry;
      school.isTrialActive = true;
      await school.save();

      if (school.subscription) {
        await Subscription.findByIdAndUpdate(school.subscription, {
          status: "trialing",
          currentPeriodEnd: newExpiry,
        });
      }

      await sendEmail({
        to: school.email,
        subject: "Your EduNexus Trial Has Been Extended!",
        html: `<p>Hi! Your free trial has been extended by <strong>${trialDays} days</strong>. New expiry: <strong>${newExpiry.toLocaleDateString("en-NG")}</strong>. Enjoy exploring EduNexus!</p>`,
      });

      return NextResponse.json({ message: `Trial extended by ${trialDays} days` });
    }

    if (action === "change_plan" && planSlug) {
      const plan = await Plan.findOne({ slug: planSlug, isActive: true });
      if (!plan) return NextResponse.json({ message: "Plan not found" }, { status: 404 });

      await Subscription.findByIdAndUpdate(school.subscription, { plan: plan._id });
      return NextResponse.json({ message: `Plan changed to ${plan.name}` });
    }

    if (action === "update_details") {
      const { name, email, slug } = body;
      if (name) school.name = name;
      if (email) school.email = email;
      if (slug) school.slug = slug;
      await school.save();
      return NextResponse.json({ message: "School details updated", school });
    }

    if (action === "reset_admin_password") {
      const User = require("@/lib/models/user").default;
      const bcrypt = require("bcryptjs");
      const adminUser = await User.findOne({ school: id, role: "admin" });
      if (!adminUser) return NextResponse.json({ message: "No admin user found for this school" }, { status: 404 });
      
      const newPassword = Math.random().toString(36).slice(-8) + "!";
      adminUser.password = newPassword; // Will be hashed by pre-save middleware
      await adminUser.save();
      
      return NextResponse.json({ 
        message: "Password reset successful", 
        newPassword,
        adminEmail: adminUser.email 
      });
    }

    if (typeof isActive === "boolean") {
      school.isActive = isActive;
      await school.save();
      return NextResponse.json({ message: "Updated", school });
    }

    return NextResponse.json({ message: "No valid action" }, { status: 400 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

// DELETE /api/superadmin/schools/[id] — Soft delete (deactivate)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const superAdmin = await getSuperAuthUser(req, ["super_admin"]);
    if (!superAdmin) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    await School.findByIdAndUpdate(id, { isActive: false });
    return NextResponse.json({ message: "School deactivated" });
  } catch (error) {
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
