import { NextRequest, NextResponse } from "next/server";
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
}