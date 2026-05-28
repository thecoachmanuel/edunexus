import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import ReportCard from "@/lib/models/reportCard";
import User from "@/lib/models/user";
import Submission from "@/lib/models/submission";
import Exam from "@/lib/models/exam";
import { getAuthUser } from "@/middleware/auth";
import { logActivity } from "@/lib/utils/activitieslog";

function calculateGrade(score: number): string {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const authUser = await getAuthUser(req, ["admin", "teacher", "parent", "student"]);
    if (!authUser) return NextResponse.json({ message: "Not authorized" }, { status: 401 });

    const searchParams = req.nextUrl.searchParams;
    const classId = searchParams.get("classId");
    const studentId = searchParams.get("studentId");

    const filter: any = {};
    if (classId) filter.class = classId;
    
    // Security: Students can only see their own, parents can only see their children's
    if (authUser.role === "student") {
      filter.student = authUser._id;
    } else if (authUser.role === "parent") {
      filter.student = { $in: authUser.children || [] };
    } else if (studentId) {
      filter.student = studentId;
    }

    const reports = await ReportCard.find(filter)
      .populate("student", "name email")
      .populate("class", "name")
      .populate("academicYear", "name")
      .populate("grades.subject", "name code")
      .sort({ createdAt: -1 });

    return NextResponse.json({ reports });
  } catch (error) {
    return NextResponse.json({ message: "Server Error", error }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const authUser = await getAuthUser(req, ["admin", "teacher"]);
    if (!authUser) return NextResponse.json({ message: "Not authorized" }, { status: 401 });

    const { classId, academicYearId, term } = await req.json();

    if (!classId || !academicYearId || !term) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    // 1. Get all students in the class
    const students = await User.find({ role: "student", studentClass: classId });

    if (students.length === 0) {
      return NextResponse.json({ message: "No students found in this class" }, { status: 404 });
    }

    // 2. Fetch all exams for this class to map submissions to subjects
    const classExams = await Exam.find({ class: classId });
    const examMap = new Map();
    classExams.forEach((exam) => {
      examMap.set(exam._id.toString(), exam.subject.toString());
    });

    const reportCards = [];

    // 3. Process each student
    for (const student of students) {
      // Check if a report card already exists for this student and term
      const existingReport = await ReportCard.exists({ 
        student: student._id, 
        academicYear: academicYearId, 
        term 
      });
      
      if (existingReport) {
        continue; // Skip this student to avoid recalculating/overwriting
      }

      // Find submissions for this student
      const submissions = await Submission.find({ student: student._id });

      // Group scores by subject
      const subjectScores: Record<string, { totalScore: number; count: number }> = {};

      submissions.forEach((sub) => {
        const subjectId = examMap.get(sub.exam.toString());
        if (subjectId) {
          if (!subjectScores[subjectId]) {
            subjectScores[subjectId] = { totalScore: 0, count: 0 };
          }
          subjectScores[subjectId].totalScore += sub.score;
          subjectScores[subjectId].count += 1;
        }
      });

      const grades = [];
      let totalAverageSum = 0;
      let subjectCount = 0;

      for (const [subjectId, data] of Object.entries(subjectScores)) {
        // Average score for this subject
        const average = data.totalScore / data.count;
        grades.push({
          subject: subjectId,
          score: Math.round(average),
          grade: calculateGrade(average),
        });
        totalAverageSum += average;
        subjectCount++;
      }

      const overallAverage = subjectCount > 0 ? Math.round(totalAverageSum / subjectCount) : 0;
      const overallGrade = calculateGrade(overallAverage);

      // Create or Update Report Card
      const reportData = {
        student: student._id,
        class: classId,
        academicYear: academicYearId,
        term,
        grades,
        averageScore: overallAverage,
        overallGrade,
      };

      const reportCard = await ReportCard.findOneAndUpdate(
        { student: student._id, academicYear: academicYearId, term },
        reportData,
        { upsert: true, new: true }
      );
      reportCards.push(reportCard);
    }

    await logActivity({
      userId: authUser._id.toString(),
      action: "Generated Report Cards",
      details: `Generated ${reportCards.length} report cards for Term: ${term}`,
    });

    return NextResponse.json({ message: "Report cards generated successfully", count: reportCards.length }, { status: 201 });
  } catch (error) {
    console.error("REPORT CARD GENERATION ERROR", error);
    return NextResponse.json({ message: "Server Error", error }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await connectDB();
    const authUser = await getAuthUser(req, ["admin", "teacher"]);
    if (!authUser) return NextResponse.json({ message: "Not authorized" }, { status: 401 });

    const body = await req.json();
    const { ids, classId, term } = body;

    let filter: any = {};
    
    if (ids && Array.isArray(ids) && ids.length > 0) {
      filter._id = { $in: ids };
    } else if (classId && term) {
      filter.class = classId;
      filter.term = term;
    } else {
      return NextResponse.json({ message: "Must provide either 'ids' or 'classId' & 'term'" }, { status: 400 });
    }

    const result = await ReportCard.deleteMany(filter);

    await logActivity({
      userId: authUser._id.toString(),
      action: "Batch Deleted Report Cards",
      details: `Deleted ${result.deletedCount} report cards.`,
    });

    return NextResponse.json({ message: "Report cards deleted successfully", count: result.deletedCount });
  } catch (error) {
    console.error("REPORT CARD BATCH DELETE ERROR", error);
    return NextResponse.json({ message: "Server Error", error }, { status: 500 });
  }
}
