import { NextRequest } from "next/server";
import jwt from "jsonwebtoken";
import SuperAdmin, { ISuperAdmin } from "@/lib/models/superAdmin";
import { connectDB } from "@/lib/db";

export type SuperRole = "super_admin" | "support_agent" | "finance_manager";

export type SuperAuthContext = {
  superAdmin: ISuperAdmin;
  superAdminId: string;
};

export const getSuperAuthUser = async (
  req: NextRequest,
  allowedRoles?: SuperRole[]
): Promise<SuperAuthContext | null> => {
  const token = req.cookies.get("saas_admin_jwt")?.value;
  if (!token) return null;

  try {
    const decoded = jwt.verify(
      token,
      process.env.SUPER_ADMIN_JWT_SECRET as string
    ) as { adminId: string };

    await connectDB();
    const admin = await SuperAdmin.findById(decoded.adminId).select("-password");
    
    if (!admin || !admin.isActive) return null;

    if (allowedRoles && !allowedRoles.includes(admin.role as SuperRole)) {
      return null;
    }

    return { superAdmin: admin, superAdminId: admin._id.toString() };
  } catch (error) {
    console.error("Super Auth error:", error);
    return null;
  }
};
