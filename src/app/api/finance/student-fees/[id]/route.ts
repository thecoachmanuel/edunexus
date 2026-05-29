export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import StudentFee from "@/lib/models/studentFee";
import { getAuthUser } from "@/middleware/auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await connectDB();
    const authUser = await getAuthUser(req);
    if (!authUser) return NextResponse.json({ message: "Not authorized" }, { status: 401 });

    const studentFee = await StudentFee.findById(id)
      .populate("student", "name rollNumber email")
      .populate("feeStructure", "name amount dueDate")
      .populate("class", "name")
      .populate("academicYear", "name")
      .lean();

    if (!studentFee) return NextResponse.json({ message: "Not found" }, { status: 404 });

    return NextResponse.json(studentFee);
  } catch (error) {
    return NextResponse.json({ message: "Server Error", error }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await connectDB();
    const authUser = await getAuthUser(req, ["admin"]);
    if (!authUser) return NextResponse.json({ message: "Not authorized" }, { status: 401 });

    const { transaction } = await req.json();
    
    const fee = await StudentFee.findById(id);
    if (!fee) return NextResponse.json({ message: "Not found" }, { status: 404 });

    if (transaction) {
      fee.transactions.push(transaction);
      fee.amountPaid += transaction.amount;
      fee.balance = fee.totalAmount - fee.amountPaid;
      if (fee.balance <= 0) {
        fee.status = "paid";
      } else if (fee.amountPaid > 0) {
        fee.status = "partial";
      }
      await fee.save();
    }

    return NextResponse.json(fee);
  } catch (error) {
    return NextResponse.json({ message: "Server Error", error }, { status: 500 });
  }
}