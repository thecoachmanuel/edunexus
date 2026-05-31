import { NextRequest } from "next/server";
import jwt from "jsonwebtoken";
import User, { IUser } from "@/lib/models/user";
import School, { ISchool } from "@/lib/models/school";
import Subscription, { ISubscription } from "@/lib/models/subscription";
import { connectDB } from "@/lib/db";

export type AuthorizedRole = "admin" | "teacher" | "student" | "parent";

/**
 * Verifies the JWT from cookies and returns the authenticated user.
 * The user object will have `school` populated and `subscriptionContext` attached.
 *
 * Multi-tenant isolation: If `expectedSlug` is provided, the function also
 * validates that the authenticated user's school slug matches the slug in the
 * request URL. Returns null (→ 401) if slugs mismatch, preventing a user from
 * one school from accessing API endpoints of another school.
 *
 * Returns null if unauthenticated, unauthorized, or tenant mismatch.
 */
export const getAuthUser = async (
  req: NextRequest,
  allowedRoles?: AuthorizedRole[],
  expectedSlug?: string,
): Promise<(IUser & { subscriptionContext?: ISubscription; schoolContext?: ISchool }) | null> => {
  const token = req.cookies.get("jwt")?.value;
  if (!token) return null;

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as { userId: string; schoolId?: string };

    await connectDB();
    const user = await User.findById(decoded.userId).select("-password") as any;
    if (!user || !user.isActive) return null;

    // Use schoolId from token, fallback to user.school (for old tokens before migration)
    const schoolId = decoded.schoolId || user.school?.toString();
    if (!schoolId) return null;

    const school = await School.findById(schoolId);
    if (!school || !school.isActive) return null;

    // ─── TENANT ISOLATION (API-LEVEL) ────────────────────────────────────────
    // If the caller provides an expected slug (from the URL), verify it matches
    // the school that owns this JWT. This prevents request forgery scenarios.
    if (expectedSlug && school.slug !== expectedSlug) {
      console.warn(`[Auth] Tenant mismatch: JWT school=${school.slug}, expected=${expectedSlug}`);
      return null;
    }
    // ─────────────────────────────────────────────────────────────────────────

    // Fetch subscription
    let subscription: ISubscription | undefined = undefined;
    if (school.subscription) {
      subscription = await Subscription.findById(school.subscription).populate("plan") as any;
    }

    if (allowedRoles && !allowedRoles.includes(user.role as AuthorizedRole)) {
      return null;
    }

    user.schoolContext = school;
    user.subscriptionContext = subscription;

    return user;
  } catch (error) {
    console.error("Auth error:", error);
    return null;
  }
};
