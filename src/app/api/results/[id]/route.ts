export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import StudentResult from "@/lib/models/studentResult";
import GradingConfig from "@/lib/models/gradingConfig";
import { getAuthUser } from "@/middleware/auth";
import { computeAggregate } from "@/lib/utils/grading";
import { regenerateReportCards } from "../route";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const authUser = await getAuthUser(req, ["admin", "teacher"]);
    if (!authUser) return NextResponse.json({ message: "Not authorized" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();

    const existing = await StudentResult.findById(id).lean<any>();
    if (!existing) return NextResponse.json({ message: "Result not found" }, { status: 404 });

    const config = await GradingConfig.findOne({
      academicYear: existing.academicYear,
      term: existing.term,
    }).lean<any>();

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

    const updated = {
      quizRawScore: body.quizRawScore ?? existing.quizRawScore,
      caScore: body.caScore ?? existing.caScore,
      examScore: body.examScore ?? existing.examScore,
    };

    const computed = computeAggregate(cfg, updated);
    const audit: any = { lastModified: new Date() };
    if ("caScore" in body) audit.caEnteredBy = authUser._id;
    if ("examScore" in body) audit.examEnteredBy = authUser._id;
    if ("quizRawScore" in body) audit.quizAdjustedBy = authUser._id;

    const result = await StudentResult.findByIdAndUpdate(
      id,
      { $set: { ...updated, ...computed, ...audit } },
      { new: true }
    ).lean();

    // Auto-regenerate report cards
    await regenerateReportCards(
      existing.class.toString(),
      existing.academicYear.toString(),
      existing.term
    );

    return NextResponse.json({ message: "Result updated and report card refreshed", result });
  } catch (error) {
    console.error("PATCH RESULT ERROR", error);
    return NextResponse.json({ message: "Server Error" }, { status: 500 });
  }
}
