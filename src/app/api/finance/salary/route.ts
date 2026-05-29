export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Salary from "@/lib/models/salary";
import User from "@/lib/models/user";
import { getAuthUser } from "@/middleware/auth";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const authUser = await getAuthUser(req, ["admin"]);
    if (!authUser) return NextResponse.json({ message: "Not authorized" }, { status: 401 });

    const searchParams = req.nextUrl.searchParams;
    const search = searchParams.get("search");
    const status = searchParams.get("status");

    const query: any = {};

    if (search) {
      const matchingStaff = await User.find({
        role: { $in: ["teacher", "admin"] },
        name: { $regex: search, $options: "i" }
      }).select("_id");
      
      const staffIds = matchingStaff.map(s => s._id);
      query.employee = { $in: staffIds };
      
      if (staffIds.length === 0) {
        return NextResponse.json({ salaries: [] });
      }
    }

    if (status && status !== "all") {
      query.status = status;
    }

    const salaries = await Salary.find(query)
      .populate("employee", "name role email")
      .sort({ year: -1, month: -1 });

    return NextResponse.json({ salaries });
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
    data.netSalary = (data.basicSalary || 0) + (data.allowances || 0) - (data.deductions || 0);
    
    const salary = await Salary.create(data);

    return NextResponse.json(salary, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: "Server Error", error }, { status: 500 });
  }
}