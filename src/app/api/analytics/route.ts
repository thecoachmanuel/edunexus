import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getAuthUser } from "@/middleware/auth";
import User from "@/lib/models/user";
import Expense from "@/lib/models/expense";
import StudentFee from "@/lib/models/studentFee";
import ReportCard from "@/lib/models/reportCard";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const authUser = await getAuthUser(req, ["admin"]);
    if (!authUser) return NextResponse.json({ message: "Not authorized" }, { status: 401 });

    // 1. Enrollment Data
    const students = await User.countDocuments({ role: "student" });
    const teachers = await User.countDocuments({ role: "teacher" });
    const parents = await User.countDocuments({ role: "parent" });
    
    const enrollmentData = [
      { name: "Students", value: students, fill: "#10b981" }, // Emerald
      { name: "Teachers", value: teachers, fill: "#3b82f6" }, // Blue
      { name: "Parents", value: parents, fill: "#8b5cf6" },  // Violet
    ];

    // 2. Finance Data (Last 6 Months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    // Aggregate Expenses
    const expenses = await Expense.aggregate([
      { $match: { date: { $gte: sixMonthsAgo } } },
      { 
        $group: { 
          _id: { year: { $year: "$date" }, month: { $month: "$date" } }, 
          total: { $sum: "$amount" } 
        } 
      }
    ]);

    // Aggregate Fee Revenue (from transactions)
    const fees = await StudentFee.aggregate([
      { $unwind: "$transactions" },
      { $match: { "transactions.date": { $gte: sixMonthsAgo } } },
      { 
        $group: { 
          _id: { year: { $year: "$transactions.date" }, month: { $month: "$transactions.date" } }, 
          total: { $sum: "$transactions.amount" } 
        } 
      }
    ]);

    // Format Finance Data
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const financeData = [];
    
    for (let i = 0; i < 6; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() - (5 - i));
      const year = d.getFullYear();
      const month = d.getMonth() + 1; // 1-12
      
      const expMatch = expenses.find(e => e._id.year === year && e._id.month === month);
      const feeMatch = fees.find(f => f._id.year === year && f._id.month === month);
      
      financeData.push({
        name: monthNames[month - 1],
        revenue: feeMatch ? feeMatch.total : 0,
        expenses: expMatch ? expMatch.total : 0,
      });
    }

    // 3. Academic Data (Subject performance from Report Cards)
    const reportCards = await ReportCard.find().populate("grades.subject", "name").lean();
    
    const subjectScores: Record<string, { total: number, count: number }> = {};
    
    reportCards.forEach((report: any) => {
      report.grades.forEach((grade: any) => {
        if (!grade.subject) return;
        const subName = grade.subject.name;
        if (!subjectScores[subName]) {
          subjectScores[subName] = { total: 0, count: 0 };
        }
        subjectScores[subName].total += grade.score;
        subjectScores[subName].count += 1;
      });
    });

    const academicData = Object.keys(subjectScores).map(sub => ({
      subject: sub,
      average: Math.round(subjectScores[sub].total / subjectScores[sub].count),
    })).sort((a, b) => b.average - a.average);

    return NextResponse.json({
      enrollmentData,
      financeData,
      academicData
    });
  } catch (error) {
    console.error("ANALYTICS ERROR:", error);
    return NextResponse.json({ message: "Server Error", error }, { status: 500 });
  }
}
