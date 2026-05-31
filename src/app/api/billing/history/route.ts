import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getAuthUser } from "@/middleware/auth";
import SaaSTransaction from "@/lib/models/saasTransaction";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const user = await getAuthUser(req, ["admin"]);
    if (!user || !user.schoolContext) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const transactions = await SaaSTransaction.find({ school: user.schoolContext._id })
      .populate("subscription", "status currentPeriodEnd nextPaymentDate")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ transactions });
  } catch (error) {
    console.error("Billing history error:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
