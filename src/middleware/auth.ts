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
 * Returns null if unauthenticated or unauthorized.
 */
export const getAuthUser = async (
  req: NextRequest,
  allowedRoles?: AuthorizedRole[]
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
