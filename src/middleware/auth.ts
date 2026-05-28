import { NextRequest } from "next/server";
import jwt from "jsonwebtoken";
import User from "@/lib/models/user";
import { connectDB } from "@/lib/db";

export type AuthorizedRole = "admin" | "teacher" | "student" | "parent";

/**
 * Verifies the JWT from cookies and returns the authenticated user.
 * Returns null if unauthenticated or unauthorized.
 */
export const getAuthUser = async (
  req: NextRequest,
  allowedRoles?: AuthorizedRole[]
) => {
  const token = req.cookies.get("jwt")?.value;
  if (!token) return null;

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as { userId: string };

    await connectDB();
    const user = await User.findById(decoded.userId).select("-password");
    if (!user || !user.isActive) return null;

    if (allowedRoles && !allowedRoles.includes(user.role as AuthorizedRole)) {
      return null;
    }

    return user;
  } catch {
    return null;
  }
};
