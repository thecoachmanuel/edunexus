export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Expense from "@/lib/models/expense";
import { getAuthUser } from "@/middleware/auth";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const authUser = await getAuthUser(req, ["admin"]);
    if (!authUser) return NextResponse.json({ message: "Not authorized" }, { status: 401 });

    const searchParams = req.nextUrl.searchParams;
    const search = searchParams.get("search");
    const category = searchParams.get("category");

    const query: any = { school: authUser.schoolContext?._id };

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } }
      ];
    }

    if (category && category !== "all") {
      query.category = category;
    }

    const expenses = await Expense.find(query)
      .populate("recordedBy", "name")
      .sort({ date: -1 })
      .lean();

    return NextResponse.json({ expenses });
  } catch (error) {
    return NextResponse.json({ message: "Server Error", error }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const authUser = await getAuthUser(req, ["admin"]);
    if (!authUser) return NextResponse.json({ message: "Not authorized" }, { status: 401 });

    const data = await req.json();
    data.recordedBy = authUser._id;
    data.school = authUser.schoolContext?._id;
    const expense = await Expense.create(data);

    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: "Server Error", error }, { status: 500 });
  }
}