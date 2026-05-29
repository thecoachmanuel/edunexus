import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import StudentFee from "@/lib/models/studentFee";
import { getAuthUser } from "@/middleware/auth";
import User from "@/lib/models/user";
import FeeStructure from "@/lib/models/feeStructure";
import Class from "@/lib/models/class";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const authUser = await getAuthUser(req);
    if (!authUser) return NextResponse.json({ message: "Not authorized" }, { status: 401 });

    const searchParams = req.nextUrl.searchParams;
    const search = searchParams.get("search");
    const status = searchParams.get("status");

    let query: any = {};
    if (authUser.role === "student") {
      query.student = authUser._id;
    } else if (authUser.role === "parent") {
      query.student = { $in: authUser.children }; // Assuming parent has children array
    }

    if (search) {
      // Find students whose name matches the search
      const matchingStudents = await User.find({
        role: "student",
        name: { $regex: search, $options: "i" }
      }).select("_id");
      
      const studentIds = matchingStudents.map(s => s._id);
      
      if (query.student) {
        // Intersect parent/student restriction with search restriction
        if (Array.isArray(query.student.$in)) {
          query.student.$in = query.student.$in.filter((id: any) => 
            studentIds.some(sid => sid.toString() === id.toString())
          );
        } else {
          // If query.student is already a specific ID (authUser._id), check if it's in the search results
          if (!studentIds.some(sid => sid.toString() === query.student.toString())) {
            query.student = null; // Forces empty result if search doesn't match the current student
          }
        }
      } else {
        query.student = { $in: studentIds };
      }
    }

    if (status && status !== "all") {
      query.status = status;
    }

    // if query.student was forced to null, bypass DB query
    if (query.student === null) {
      return NextResponse.json({ studentFees: [] });
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
    
    // Check if it's a bulk assignment by class
    if (data.assignToClass && data.classId && data.feeStructureId && data.totalAmount) {
      const students = await User.find({ role: "student", studentClass: data.classId }).select("_id").lean();
      
      if (students.length === 0) {
        return NextResponse.json({ message: "No students found in this class" }, { status: 404 });
      }

      // Prepare fees to insert
      const fees = students.map((s) => ({
        student: s._id,
        feeStructure: data.feeStructureId,
        class: data.classId,
        academicYear: data.academicYear,
        totalAmount: data.totalAmount,
        amountPaid: 0,
        balance: data.totalAmount,
        status: "unpaid",
        transactions: []
      }));

      const createdFees = await StudentFee.insertMany(fees);
      return NextResponse.json({ message: "Bulk assigned successfully", count: createdFees.length }, { status: 201 });
    }

    // Check if it's a bulk assignment by array of student IDs (legacy)
    if (data.students && Array.isArray(data.students)) {
      const fees = data.students.map((studentId: string) => ({
        ...data,
        student: studentId,
        students: undefined,
        amountPaid: 0,
        balance: data.totalAmount,
        status: "unpaid"
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