export const dynamic = "force-dynamic";
import { NextResponse, NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/lib/models/user";
import jwt from "jsonwebtoken";
import { getSchoolFeatures } from "@/lib/utils/planEnforcer";

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("jwt")?.value;
    if (!token) {
      return NextResponse.json({ message: "Not authorized, no token" }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { userId: string };
    await connectDB();
    const user = await User.findById(decoded.userId).select("-password").lean();

    if (user) {
      let schoolContext = null;
      if (user.school) {
        const planInfo = await getSchoolFeatures(user.school.toString());
        schoolContext = {
          _id: user.school,
          features: planInfo.features,
          isTrial: planInfo.isTrial,
          status: planInfo.status,
          planName: planInfo.planName
        };
      }

      return NextResponse.json({
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          schoolContext,
        },
      });
    } else {
      return NextResponse.json({ message: "Not authorized, user not found" }, { status: 401 });
    }
  } catch (error) {
    return NextResponse.json({ message: "Not authorized, token failed", error }, { status: 401 });
  }
}
