export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import StudentFee from "@/lib/models/studentFee";
import Expense from "@/lib/models/expense";
import Salary from "@/lib/models/salary";
import { getAuthUser } from "@/middleware/auth";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const authUser = await getAuthUser(req, ["admin"]);
    if (!authUser) return NextResponse.json({ message: "Not authorized" }, { status: 401 });

    const fees = await StudentFee.find({});
    const expenses = await Expense.find({});
    const salaries = await Salary.find({ status: "paid" });

    const totalFeesCollected = fees.reduce((acc, fee) => acc + (fee.amountPaid || 0), 0);
    const pendingFees = fees.reduce((acc, fee) => acc + (fee.balance || 0), 0);
    const totalExpenses = expenses.reduce((acc, exp) => acc + (exp.amount || 0), 0) + salaries.reduce((acc, sal) => acc + (sal.netSalary || 0), 0);
    const netBalance = totalFeesCollected - totalExpenses;

    return NextResponse.json({
      totalFeesCollected,
      pendingFees,
      totalExpenses,
      netBalance
    });
  } catch (error) {
    return NextResponse.json({ message: "Server Error", error }, { status: 500 });
  }
}