export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import StudentResult from "@/lib/models/studentResult";
import GradingConfig from "@/lib/models/gradingConfig";
import ReportCard from "@/lib/models/reportCard";
import User from "@/lib/models/user";
import { getAuthUser } from "@/middleware/auth";
import { computeAggregate } from "@/lib/utils/grading";

// ─── Helper: regenerate report cards for a class/term automatically ──────────
async function regenerateReportCards(
  classId: string,
  academicYearId: string,
  term: string
) {
  const config = await GradingConfig.findOne({ academicYear: academicYearId, term }).lean();
  const defaultConfig = {
    quizWeight: 10, quizMaxScore: 100,
    caWeight: 20, caMaxScore: 20,
    examWeight: 70, examMaxScore: 70,
    gradeThresholds: [
      { grade: "A", minScore: 75, remark: "Distinction" },
      { grade: "B", minScore: 60, remark: "Credit" },
      { grade: "C", minScore: 50, remark: "Merit" },
      { grade: "D", minScore: 40, remark: "Pass" },
      { grade: "F", minScore: 0,  remark: "Fail" },
    ],
    showPositionOnReportCard: true,
  };
  const cfg: any = config ?? defaultConfig;

  // Fetch all results for this class/term
  const results = await StudentResult.find({ class: classId, academicYear: academicYearId, term }).lean();
  if (results.length === 0) return;

  // Group by student
  const byStudent: Record<string, any[]> = {};
  for (const r of results) {
    const sid = r.student.toString();
    if (!byStudent[sid]) byStudent[sid] = [];
    byStudent[sid].push(r);
  }

  // Build report cards and collect averages for ranking
  const studentAverages: { studentId: string; avg: number }[] = [];

  for (const [studentId, studentResults] of Object.entries(byStudent)) {
    const grades = studentResults.map((r: any) => {
      const computed = computeAggregate(cfg, {
        quizRawScore: r.quizRawScore,
        caScore: r.caScore,
        examScore: r.examScore,
      });
      return {
        subject: r.subject,
        quizScore: computed.quizScore,
        caScore: computed.caScore,
        examScore: computed.examScore,
        aggregateScore: computed.aggregateScore,
        grade: computed.grade,
        remark: computed.remark,
      };
    });

    const totalScore = grades.reduce((s, g) => s + g.aggregateScore, 0);
    const averageScore = grades.length > 0 ? Math.round(totalScore / grades.length) : 0;

    studentAverages.push({ studentId, avg: averageScore });

    // Determine overall grade from average
    const sorted = [...cfg.gradeThresholds].sort((a: any, b: any) => b.minScore - a.minScore);
    let overallGrade = "F";
    for (const t of sorted) {
      if (averageScore >= t.minScore) { overallGrade = t.grade; break; }
    }

    await ReportCard.findOneAndUpdate(
      { student: studentId, academicYear: academicYearId, term },
      {
        student: studentId,
        class: classId,
        academicYear: academicYearId,
        term,
        grades,
        totalScore,
        averageScore,
        overallGrade,
        showPosition: cfg.showPositionOnReportCard,
        // Position will be updated in bulk below
      },
      { upsert: true, new: true }
    );
  }

  // Rank students: sort by average descending, assign positions
  studentAverages.sort((a, b) => b.avg - a.avg);
  const totalStudents = studentAverages.length;

  for (let i = 0; i < studentAverages.length; i++) {
    const position = i + 1;
    await ReportCard.findOneAndUpdate(
      { student: studentAverages[i].studentId, academicYear: academicYearId, term },
      { position, totalStudents }
    );
  }
}

// ─── GET: Broadsheet data for a class/term ─────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const authUser = await getAuthUser(req, ["admin", "teacher"]);
    if (!authUser) return NextResponse.json({ message: "Not authorized" }, { status: 401 });

    const { searchParams } = req.nextUrl;
    const classId = searchParams.get("classId");
    const academicYearId = searchParams.get("academicYearId");
    const term = searchParams.get("term");

    if (!classId || !academicYearId || !term) {
      return NextResponse.json({ message: "classId, academicYearId and term are required" }, { status: 400 });
    }

    // Teachers only see results for their subjects
    const filter: any = { class: classId, academicYear: academicYearId, term };
    if (authUser.role === "teacher") {
      const teacherSubjects = (authUser as any).teacherSubject || [];
      filter.subject = { $in: teacherSubjects };
    }

    const results = await StudentResult.find(filter)
      .populate("student", "name email")
      .populate("subject", "name code")
      .sort({ "student.name": 1 })
      .lean();

    const config = await GradingConfig.findOne({ academicYear: academicYearId, term }).lean();

    return NextResponse.json({ results, config });
  } catch (error) {
    console.error("GET RESULTS ERROR", error);
    return NextResponse.json({ message: "Server Error" }, { status: 500 });
  }
}

// ─── PUT: Bulk save broadsheet (upsert all results for a class/term) ─────────
export async function PUT(req: NextRequest) {
  try {
    await connectDB();
    const authUser = await getAuthUser(req, ["admin", "teacher"]);
    if (!authUser) return NextResponse.json({ message: "Not authorized" }, { status: 401 });

    const body = await req.json();
    const { classId, academicYearId, term, results } = body;

    if (!classId || !academicYearId || !term || !Array.isArray(results)) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    const config = await GradingConfig.findOne({ academicYear: academicYearId, term }).lean<any>();

    const bulkOps = results.map((r: any) => {
      const cfg = config ?? {
        quizWeight: 10, quizMaxScore: 100,
        caWeight: 20, caMaxScore: 20,
        examWeight: 70, examMaxScore: 70,
        gradeThresholds: [
          { grade: "A", minScore: 75, remark: "Distinction" },
          { grade: "B", minScore: 60, remark: "Credit" },
          { grade: "C", minScore: 50, remark: "Merit" },
          { grade: "D", minScore: 40, remark: "Pass" },
          { grade: "F", minScore: 0, remark: "Fail" },
        ],
      };

      const computed = computeAggregate(cfg, {
        quizRawScore: r.quizRawScore ?? 0,
        caScore: r.caScore ?? 0,
        examScore: r.examScore ?? 0,
      });

      return {
        updateOne: {
          filter: { student: r.studentId, subject: r.subjectId, academicYear: academicYearId, term },
          update: {
            $set: {
              student: r.studentId,
              subject: r.subjectId,
              class: classId,
              academicYear: academicYearId,
              term,
              quizRawScore: r.quizRawScore ?? 0,
              quizMaxScore: cfg.quizMaxScore,
              caScore: r.caScore ?? 0,
              caMaxScore: cfg.caMaxScore,
              examScore: r.examScore ?? 0,
              examMaxScore: cfg.examMaxScore,
              aggregateScore: computed.aggregateScore,
              grade: computed.grade,
              remark: computed.remark,
              ...(r.caEnteredBy && { caEnteredBy: r.caEnteredBy }),
              ...(r.examEnteredBy && { examEnteredBy: r.examEnteredBy }),
              ...(r.quizAdjustedBy && { quizAdjustedBy: r.quizAdjustedBy }),
              lastModified: new Date(),
            },
          },
          upsert: true,
        },
      };
    });

    if (bulkOps.length > 0) {
      await (StudentResult as any).bulkWrite(bulkOps);
    }

    // Auto-regenerate report cards for the class
    await regenerateReportCards(classId, academicYearId, term);

    return NextResponse.json({ message: "Results saved and report cards updated successfully" });
  } catch (error) {
    console.error("PUT RESULTS ERROR", error);
    return NextResponse.json({ message: "Server Error" }, { status: 500 });
  }
}

// ─── POST: Auto-populate quiz scores from Submission model ─────────────────
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const authUser = await getAuthUser(req, ["admin", "teacher"]);
    if (!authUser) return NextResponse.json({ message: "Not authorized" }, { status: 401 });

    const body = await req.json();
    const { classId, academicYearId, term } = body;

    if (!classId || !academicYearId || !term) {
      return NextResponse.json({ message: "classId, academicYearId and term are required" }, { status: 400 });
    }

    // Lazy-load models to avoid circular issues at top of module
    const Exam = (await import("@/lib/models/exam")).default;
    const Submission = (await import("@/lib/models/submission")).default;

    const config = await GradingConfig.findOne({ academicYear: academicYearId, term }).lean<any>();
    const quizMaxScore = config?.quizMaxScore ?? 100;

    // Get all exams (quizzes) for this class
    const exams = await Exam.find({ class: classId }).lean();
    if (exams.length === 0) {
      return NextResponse.json({ message: "No quizzes found for this class", populated: 0 });
    }

    // Build exam → subject map
    const examSubjectMap = new Map(exams.map((e: any) => [e._id.toString(), e.subject.toString()]));

    // Get all students in the class
    const students = await User.find({ role: "student", studentClass: classId }).lean();
    let populated = 0;

    for (const student of students) {
      const submissions = await Submission.find({
        student: student._id,
        exam: { $in: exams.map((e: any) => e._id) },
      }).lean();

      // Group submissions by subject, average scores
      const subjectScores: Record<string, { total: number; count: number; maxPossible: number }> = {};
      for (const sub of submissions) {
        const subjectId = examSubjectMap.get(sub.exam.toString());
        if (!subjectId) continue;
        const exam = exams.find((e: any) => e._id.toString() === sub.exam.toString());
        const maxPoints = exam?.questions?.reduce((s: number, q: any) => s + (q.points || 1), 0) || 1;
        if (!subjectScores[subjectId]) subjectScores[subjectId] = { total: 0, count: 0, maxPossible: maxPoints };
        subjectScores[subjectId].total += sub.score;
        subjectScores[subjectId].count += 1;
      }

      for (const [subjectId, data] of Object.entries(subjectScores)) {
        // Normalise to quizMaxScore (scale average score to the configured max)
        const avgRatio = data.total / (data.count * data.maxPossible);
        const normalised = Math.round(avgRatio * quizMaxScore);

        await StudentResult.findOneAndUpdate(
          { student: student._id, subject: subjectId, academicYear: academicYearId, term },
          {
            $setOnInsert: { class: classId, caScore: 0, examScore: 0 },
            $set: { quizRawScore: normalised, quizMaxScore, lastModified: new Date() },
          },
          { upsert: true }
        );
        populated++;
      }
    }

    return NextResponse.json({ message: `Quiz scores populated for ${populated} student-subject records`, populated });
  } catch (error) {
    console.error("POPULATE QUIZ SCORES ERROR", error);
    return NextResponse.json({ message: "Server Error" }, { status: 500 });
  }
}

export { regenerateReportCards };
