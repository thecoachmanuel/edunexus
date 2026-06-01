import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getSuperAuthUser } from "@/middleware/superAuth";
import SaaSTransaction from "@/lib/models/saasTransaction";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const superAdmin = await getSuperAuthUser(req);
    if (!superAdmin) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const sp = req.nextUrl.searchParams;
    const page = Math.max(1, Number(sp.get("page")) || 1);
    const limit = Math.min(50, Math.max(1, Number(sp.get("limit")) || 15));
    const skip = (page - 1) * limit;
    const statusFilter = sp.get("status") || "";
    const typeFilter = sp.get("type") || "";
    const search = sp.get("search")?.trim() || "";

    // Build match query
    const match: any = {};
    if (statusFilter) match.status = statusFilter;
    if (typeFilter) match.type = typeFilter;

    // Fetch all transactions with populated school for search
    let query = SaaSTransaction.find(match)
      .populate("school", "name slug")
      .populate({ path: "subscription", populate: { path: "plan", select: "name" } })
      .sort({ createdAt: -1 });

    // Get total for pagination before applying skip/limit
    let allDocs = await query.lean();

    // Apply text search on school name/slug/reference in JS (lightweight for admin use)
    if (search) {
      const lc = search.toLowerCase();
      allDocs = allDocs.filter(
        (tx: any) =>
          tx.school?.name?.toLowerCase().includes(lc) ||
          tx.school?.slug?.toLowerCase().includes(lc) ||
          tx.reference?.toLowerCase().includes(lc) ||
          tx.description?.toLowerCase().includes(lc)
      );
    }

    const total = allDocs.length;
    const transactions = allDocs.slice(skip, skip + limit);

    // Summary stats (always over ALL successful transactions — no filters applied to summary)
    const [revenueAgg, successCount, failedCount] = await Promise.all([
      SaaSTransaction.aggregate([
        { $match: { status: "success" } },
        { $group: { _id: null, total: { $sum: "$amountKobo" } } },
      ]),
      SaaSTransaction.countDocuments({ status: "success" }),
      SaaSTransaction.countDocuments({ status: { $in: ["failed", "abandoned"] } }),
    ]);

    return NextResponse.json({
      transactions,
      pagination: { total, page, pages: Math.ceil(total / limit) },
      summary: {
        totalRevenue: revenueAgg[0]?.total || 0,
        successCount,
        failedCount,
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
