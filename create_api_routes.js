const fs = require('fs');
const path = require('path');

const routes = {
  'src/app/api/finance/overview/route.ts': `import { NextRequest, NextResponse } from "next/server";
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
}`,

  'src/app/api/finance/fee-structures/route.ts': `import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import FeeStructure from "@/lib/models/feeStructure";
import { getAuthUser } from "@/middleware/auth";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const authUser = await getAuthUser(req, ["admin"]);
    if (!authUser) return NextResponse.json({ message: "Not authorized" }, { status: 401 });

    const feeStructures = await FeeStructure.find({})
      .populate("class", "name")
      .populate("academicYear", "name")
      .sort({ createdAt: -1 });

    return NextResponse.json({ feeStructures });
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
    const feeStructure = await FeeStructure.create(data);

    return NextResponse.json(feeStructure, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: "Server Error", error }, { status: 500 });
  }
}`,

  'src/app/api/finance/student-fees/route.ts': `import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import StudentFee from "@/lib/models/studentFee";
import { getAuthUser } from "@/middleware/auth";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const authUser = await getAuthUser(req);
    if (!authUser) return NextResponse.json({ message: "Not authorized" }, { status: 401 });

    let query: any = {};
    if (authUser.role === "student") {
      query.student = authUser._id;
    } else if (authUser.role === "parent") {
      query.student = { $in: authUser.children }; // Assuming parent has children array
    }

    const studentFees = await StudentFee.find(query)
      .populate("student", "name rollNumber")
      .populate("feeStructure", "name category")
      .populate("class", "name")
      .sort({ createdAt: -1 });

    return NextResponse.json({ studentFees });
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
    
    // Check if it's a bulk assignment
    if (data.students && Array.isArray(data.students)) {
      const fees = data.students.map((studentId: string) => ({
        ...data,
        student: studentId,
        students: undefined
      }));
      const createdFees = await StudentFee.insertMany(fees);
      return NextResponse.json({ message: "Bulk assigned successfully", count: createdFees.length }, { status: 201 });
    }

    const studentFee = await StudentFee.create(data);
    return NextResponse.json(studentFee, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: "Server Error", error }, { status: 500 });
  }
}`,

  'src/app/api/finance/student-fees/[id]/route.ts': `import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import StudentFee from "@/lib/models/studentFee";
import { getAuthUser } from "@/middleware/auth";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    const authUser = await getAuthUser(req);
    if (!authUser) return NextResponse.json({ message: "Not authorized" }, { status: 401 });

    const studentFee = await StudentFee.findById(params.id)
      .populate("student", "name rollNumber email")
      .populate("feeStructure", "name amount dueDate")
      .populate("class", "name")
      .populate("academicYear", "name");

    if (!studentFee) return NextResponse.json({ message: "Not found" }, { status: 404 });

    return NextResponse.json(studentFee);
  } catch (error) {
    return NextResponse.json({ message: "Server Error", error }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    const authUser = await getAuthUser(req, ["admin"]);
    if (!authUser) return NextResponse.json({ message: "Not authorized" }, { status: 401 });

    const { transaction } = await req.json();
    
    const fee = await StudentFee.findById(params.id);
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
}`,

  'src/app/api/finance/expenses/route.ts': `import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Expense from "@/lib/models/expense";
import { getAuthUser } from "@/middleware/auth";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const authUser = await getAuthUser(req, ["admin"]);
    if (!authUser) return NextResponse.json({ message: "Not authorized" }, { status: 401 });

    const expenses = await Expense.find({})
      .populate("recordedBy", "name")
      .sort({ date: -1 });

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
    const expense = await Expense.create(data);

    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: "Server Error", error }, { status: 500 });
  }
}`,

  'src/app/api/finance/salary/route.ts': `import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Salary from "@/lib/models/salary";
import { getAuthUser } from "@/middleware/auth";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const authUser = await getAuthUser(req, ["admin"]);
    if (!authUser) return NextResponse.json({ message: "Not authorized" }, { status: 401 });

    const salaries = await Salary.find({})
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
}`
};

Object.keys(routes).forEach(filepath => {
  fs.mkdirSync(path.dirname(filepath), { recursive: true });
  fs.writeFileSync(filepath, routes[filepath]);
  console.log(`Created ${filepath}`);
});

