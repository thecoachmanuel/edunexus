export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import ActivityLog from "@/lib/models/activitieslog";
import User from "@/lib/models/user";
import jwt from "jsonwebtoken";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const token = req.cookies.get("jwt")?.value;
    if (!token) return NextResponse.json({ message: "Not authorized" }, { status: 401 });
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { userId: string };
    const user = await User.findById(decoded.userId).lean();
    if (!user) return NextResponse.json({ message: "Not authorized" }, { status: 401 });

    const limit = 20;

    // Admins see all activity. Others see only their own.
    const query = user.role === "admin" ? {} : { user: user._id };

    const logs = await ActivityLog.find(query)
      .populate("user", "name role")
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const notifications = logs.map((log: any) => ({
      _id: log._id.toString(),
      action: log.action,
      details: log.details,
      actor: log.user?.name || "System",
      actorRole: log.user?.role || "system",
      createdAt: log.createdAt,
    }));

    return NextResponse.json({ notifications });
  } catch (error) {
    console.error("Notifications Error:", error);
    return NextResponse.json({ message: "Server Error" }, { status: 500 });
  }
}
