import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getSuperAuthUser } from "@/middleware/superAuth";
import SaaSTransaction from "@/lib/models/saasTransaction";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const superAdmin = await getSuperAuthUser(req);
    if (!superAdmin) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const searchParams = req.nextUrl.searchParams;
    const page = Number(searchParams.get("page")) || 1;
    const limit = Number(searchParams.get("limit")) || 20;
    const skip = (page - 1) * limit;

    const count = await SaaSTransaction.countDocuments();
    const transactions = await SaaSTransaction.find()
      .populate("school", "name slug")
      .populate({ path: "subscription", populate: { path: "plan" } })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return NextResponse.json({
      transactions,
      pagination: { total: count, page, pages: Math.ceil(count / limit) },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
