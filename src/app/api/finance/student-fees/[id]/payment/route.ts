import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import StudentFee from "@/lib/models/studentFee";
import { getAuthUser } from "@/middleware/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const authUser = await getAuthUser(req, ["admin"]);
    if (!authUser)
      return NextResponse.json({ message: "Not authorized" }, { status: 401 });

    const { amount, method, notes, receiptNumber } = await req.json();

    if (!amount || amount <= 0) {
      return NextResponse.json({ message: "Invalid amount" }, { status: 400 });
    }

    const { id } = await params;
    const fee = await StudentFee.findById(id);
    if (!fee) {
      return NextResponse.json({ message: "Fee not found" }, { status: 404 });
    }

    if (fee.balance === 0) {
      return NextResponse.json({ message: "Fee is already fully paid" }, { status: 400 });
    }

    const payAmount = Number(amount);
    if (payAmount > fee.balance) {
      return NextResponse.json({ message: "Amount exceeds remaining balance" }, { status: 400 });
    }

    // Update balances
    fee.amountPaid += payAmount;
    fee.balance -= payAmount;
    
    // Update status
    if (fee.balance === 0) {
      fee.status = "paid";
    } else {
      fee.status = "partial";
    }

    // Push transaction
    fee.transactions.push({
      amount: payAmount,
      date: new Date(),
      method: method || "bank_transfer",
      receiptNumber: receiptNumber || "",
      notes: notes || "Manual payment recorded by Admin",
    });

    await fee.save();

    return NextResponse.json({ message: "Payment recorded successfully", fee });
  } catch (error) {
    console.error("Payment error:", error);
    return NextResponse.json({ message: "Server Error", error }, { status: 500 });
  }
}
