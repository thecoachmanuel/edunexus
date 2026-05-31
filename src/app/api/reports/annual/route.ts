import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import ReportCard from "@/lib/models/reportCard";
import AcademicYear from "@/lib/models/academicYear";
import { getAuthUser } from "@/middleware/auth";

function getOverallGradeLabel(score: number): string {
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
    const academicYearId = searchParams.get("academicYearId");
    const classId = searchParams.get("classId");
    const studentId = searchParams.get("studentId");

    if (!academicYearId) {
      return NextResponse.json({ message: "academicYearId is required" }, { status: 400 });
    }

    const filter: any = { school: authUser.schoolContext?._id, academicYear: academicYearId };
    if (classId) filter.class = classId;
    
    // Security: Students can only see their own, parents can only see their children's
    if (authUser.role === "student") {
      filter.student = authUser._id;
    } else if (authUser.role === "parent") {
      filter.student = { $in: authUser.children || [] };
    } else if (studentId) {
      filter.student = studentId;
    }

    const allReports = await ReportCard.find(filter)
      .populate("student", "name email")
      .populate("class", "name")
      .populate("academicYear", "name")
      .populate("grades.subject", "name code")
      .lean();

    // Group by student
    const studentAnnualReports = new Map<string, any>();

    allReports.forEach((report) => {
      const sId = report.student._id.toString();
      if (!studentAnnualReports.has(sId)) {
        studentAnnualReports.set(sId, {
          student: report.student,
          class: report.class,
          academicYear: report.academicYear,
          terms: [], // raw reports
          subjectAverages: {}, // aggregated
          annualTotalScore: 0,
          annualMaxScore: 0,
          annualAverage: 0,
        });
      }
      const aggregated = studentAnnualReports.get(sId);
      aggregated.terms.push(report);

      // Aggregate subjects
      report.grades.forEach((grade: any) => {
        const subId = grade.subject._id.toString();
        if (!aggregated.subjectAverages[subId]) {
          aggregated.subjectAverages[subId] = {
            subject: grade.subject,
            totalScore: 0,
            termCount: 0,
            termScores: { "Term 1": null, "Term 2": null, "Term 3": null },
          };
        }
        aggregated.subjectAverages[subId].totalScore += grade.score;
        aggregated.subjectAverages[subId].termCount += 1;
        if (report.term) {
           aggregated.subjectAverages[subId].termScores[report.term] = grade.score;
        }
      });
    });

    // Calculate final averages and ranks
    const finalReports = Array.from(studentAnnualReports.values()).map((report) => {
      let annualTotalScore = 0;
      let subjectCount = 0;

      const subjectGrades = Object.values(report.subjectAverages).map((subj: any) => {
        const averageScore = Math.round(subj.totalScore / 3); // Average across 3 terms (or subj.termCount if you prefer partial averages)
        annualTotalScore += averageScore;
        subjectCount += 1;

        let gradeLabel = "F";
        if (averageScore >= 90) gradeLabel = "A";
        else if (averageScore >= 80) gradeLabel = "B";
        else if (averageScore >= 70) gradeLabel = "C";
        else if (averageScore >= 60) gradeLabel = "D";

        return {
          subject: subj.subject,
          score: averageScore,
          grade: gradeLabel,
          termScores: subj.termScores,
        };
      });

      report.grades = subjectGrades;
      report.overallGrade = subjectCount > 0 ? getOverallGradeLabel(annualTotalScore / subjectCount) : "F";
      report.annualTotalScore = annualTotalScore;
      report.annualMaxScore = subjectCount * 100;
      report.annualAverage = subjectCount > 0 ? (annualTotalScore / subjectCount).toFixed(2) : 0;
      report.averageScore = report.annualAverage;

      return report;
    });

    // Sort by annualTotalScore to determine rank
    finalReports.sort((a, b) => b.annualTotalScore - a.annualTotalScore);

    finalReports.forEach((report, index) => {
      report.annualRank = index + 1;
    });

    return NextResponse.json({ reports: finalReports });
  } catch (error) {
    return NextResponse.json({ message: "Server Error", error }, { status: 500 });
  }
}
