export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import GradingConfig from "@/lib/models/gradingConfig";
import { getAuthUser } from "@/middleware/auth";

// GET: Fetch grading config for a given year+term
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const authUser = await getAuthUser(req, ["admin", "teacher"]);
    if (!authUser) return NextResponse.json({ message: "Not authorized" }, { status: 401 });

    const { searchParams } = req.nextUrl;
    const academicYearId = searchParams.get("academicYearId");
    const term = searchParams.get("term");

    const filter: any = { school: authUser.schoolContext?._id };
    if (academicYearId) filter.academicYear = academicYearId;
    if (term) filter.term = term;

    // If both provided, return single config; else return list
    if (academicYearId && term) {
      const config = await GradingConfig.findOne(filter).lean();
      return NextResponse.json({ config });
    }

    const configs = await GradingConfig.find(filter).populate("academicYear", "name").lean();
    return NextResponse.json({ configs });
  } catch (error) {
    console.error("GET GRADING CONFIG ERROR", error);
    return NextResponse.json({ message: "Server Error" }, { status: 500 });
  }
}

// POST: Create or upsert grading config for a term
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const authUser = await getAuthUser(req, ["admin"]);
    if (!authUser) return NextResponse.json({ message: "Not authorized" }, { status: 401 });

    const body = await req.json();
    const {
      academicYearId,
      term,
      quizWeight,
      caWeight,
      examWeight,
      quizMaxScore,
      caMaxScore,
      examMaxScore,
      gradeThresholds,
      showPositionOnReportCard,
    } = body;

    if (!academicYearId || !term) {
      return NextResponse.json({ message: "academicYearId and term are required" }, { status: 400 });
    }

    // Validate weights sum to 100
    const total = (quizWeight ?? 10) + (caWeight ?? 20) + (examWeight ?? 70);
    if (total !== 100) {
      return NextResponse.json(
        { message: `Score weights must total 100. Currently: ${total}` },
        { status: 400 }
      );
    }

    const config = await GradingConfig.findOneAndUpdate(
      { school: authUser.schoolContext?._id, academicYear: academicYearId, term },
      {
        school: authUser.schoolContext?._id,
        academicYear: academicYearId,
        term,
        quizWeight: quizWeight ?? 10,
        caWeight: caWeight ?? 20,
        examWeight: examWeight ?? 70,
        quizMaxScore: quizMaxScore ?? 100,
        caMaxScore: caMaxScore ?? 20,
        examMaxScore: examMaxScore ?? 70,
        ...(gradeThresholds && { gradeThresholds }),
        ...(showPositionOnReportCard !== undefined && { showPositionOnReportCard }),
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({ message: "Grading config saved successfully", config }, { status: 200 });
  } catch (error) {
    console.error("POST GRADING CONFIG ERROR", error);
    return NextResponse.json({ message: "Server Error" }, { status: 500 });
  }
}
