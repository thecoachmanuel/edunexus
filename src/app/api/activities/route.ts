export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import ActivityLog from "@/lib/models/activitieslog";
import { getAuthUser } from "@/middleware/auth";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const authUser = await getAuthUser(req);
    if (!authUser) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const searchParams = req.nextUrl.searchParams;
    const page = Number(searchParams.get("page")) || 1;
    const limit = Number(searchParams.get("limit")) || 10;
    const skip = (page - 1) * limit;

    const count = await ActivityLog.countDocuments({ school: authUser.schoolContext?._id });
    const logs = await ActivityLog.find({ school: authUser.schoolContext?._id })
      .populate("user", "name email role")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return NextResponse.json({
      logs,
      page,
      pages: Math.ceil(count / limit),
      total: count,
    });
  } catch (error) {
    return NextResponse.json({ message: "Server Error", error }, { status: 500 });
  }
}
