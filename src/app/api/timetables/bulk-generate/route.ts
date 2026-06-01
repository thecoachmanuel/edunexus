export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Class from "@/lib/models/class";
import User from "@/lib/models/user";
import Timetable from "@/lib/models/timetable";
import School from "@/lib/models/school";
import { getAuthUser } from "@/middleware/auth";
import { logActivity } from "@/lib/utils/activitieslog";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { aiRateLimiter } from "@/lib/rate-limit";
import { getSchoolFeatures } from "@/lib/utils/planEnforcer";

const isValidObjectId = (id: any) =>
  typeof id === "string" && /^[0-9a-fA-F]{24}$/.test(id);

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const authUser = await getAuthUser(req, ["admin"]);
    if (!authUser || !authUser.schoolContext) {
      return NextResponse.json({ message: "Not authorized" }, { status: 401 });
    }

    const schoolId = authUser.schoolContext._id.toString();

    // ── Step 1: Check Limits ──────────────────────────────────────────────────
    const rateLimit = aiRateLimiter.check(authUser._id.toString());
    if (!rateLimit.success) {
      return NextResponse.json(
        { message: "Too many AI requests. Please wait a moment." },
        { status: 429 }
      );
    }

    const schoolFeatures = await getSchoolFeatures(schoolId);
    if (!schoolFeatures.hasFeature("aiTimetableEnabled")) {
      return NextResponse.json(
        { message: "AI Timetable Generation is not enabled on your plan." },
        { status: 403 }
      );
    }

    const school = await School.findById(schoolId);
    if (!school) return NextResponse.json({ message: "School not found" }, { status: 404 });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let currentUsage = school.aiTimetableUsage?.count || 0;
    if (school.aiTimetableUsage?.date) {
      const usageDate = new Date(school.aiTimetableUsage.date);
      usageDate.setHours(0, 0, 0, 0);
      if (usageDate.getTime() !== today.getTime()) {
        currentUsage = 0; // reset for a new day
      }
    }

    // Use limit from plan features (resolved by getSchoolFeatures)
    const dailyLimit = schoolFeatures.dailyTimetableLimit;

    if (currentUsage >= dailyLimit) {
      return NextResponse.json(
        { message: `You have reached your daily bulk generation limit of ${dailyLimit}. Please upgrade your plan or try again tomorrow.` },
        { status: 429 }
      );
    }

    // ── Step 2: Parse Request ─────────────────────────────────────────────────
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
    }

    const { academicYearId, term, settings } = body;
    if (!academicYearId || !term || !settings) {
      return NextResponse.json({ message: "academicYearId, term, and settings are required" }, { status: 400 });
    }

    // ── Step 3: Fetch Data ────────────────────────────────────────────────────
    const classes = await Class.find({ school: schoolId }).populate("subjects").lean();
    if (classes.length === 0) {
      return NextResponse.json({ message: "No classes found to generate timetables for." }, { status: 400 });
    }

    const teachers = await User.find({ school: schoolId, role: "teacher" }).lean();
    if (teachers.length === 0) {
      return NextResponse.json({ message: "No teachers found." }, { status: 400 });
    }

    // Build compressed payloads for AI
    const classPayload = classes.map((c: any) => ({
      id: c._id.toString(),
      name: c.name,
      subjects: (c.subjects || []).map((s: any) => s._id.toString())
    }));

    const teacherPayload = teachers.map((t: any) => ({
      id: t._id.toString(),
      subjects: (t.teacherSubject || []).map((s: any) => s.toString())
    }));

    // ── Step 4: Build Compressed Prompt ───────────────────────────────────────
    const startTime = settings.startTime || "08:00";
    const endTime = settings.endTime || "15:00";
    const periodsPerDay = Math.min(Number(settings.periods) || 8, 12);
    
    // We request a 2D array representation for 5 days (Mon-Fri)
    const prompt = `You are an AI generating a school timetable for ALL classes simultaneously to ensure ZERO teacher overlapping.
Output ONLY valid JSON.

CLASSES: ${JSON.stringify(classPayload)}
TEACHERS: ${JSON.stringify(teacherPayload)}

RULES:
1. Generate exactly 5 days (Monday-Friday), with exactly ${periodsPerDay} periods per day for EACH class.
2. Ensure NO TEACHER is assigned to two different classes at the exact same period index on the exact same day.
3. Only assign teachers to subjects they teach (matching IDs).
4. For breaks or free periods, output null instead of a string.
5. Format the output as a JSON object where keys are class IDs, and values are 2D arrays (5 days x ${periodsPerDay} periods).
6. Each slot in the 2D array MUST be a string "subjectId:teacherId" OR null.

EXAMPLE OUTPUT FORMAT:
{
  "classId1": [
    ["subjId:teachId", "subjId:teachId", null, "subjId:teachId"], // Monday
    ["subjId:teachId", null, "subjId:teachId", "subjId:teachId"], // Tuesday
    ... (5 days total)
  ],
  "classId2": [ ... ]
}`;

    // ── Step 5: Call Gemini Flash Lite ────────────────────────────────────────
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-lite",
      generationConfig: { responseMimeType: "application/json" },
    });

    let rawText = "";
    try {
      const raceResult = await Promise.race([
        model.generateContent(prompt),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("AI_TIMEOUT")), 50000))
      ]);
      rawText = (raceResult as any).response.text();
    } catch (aiErr: any) {
      if (aiErr?.message === "AI_TIMEOUT") return NextResponse.json({ message: "Generation timed out." }, { status: 504 });
      return NextResponse.json({ message: "AI generation failed.", detail: aiErr?.message }, { status: 502 });
    }

    // ── Step 6: Parse and Expand ─────────────────────────────────────────────
    let aiOutput: any;
    try {
      const jsonStr = rawText.substring(rawText.indexOf("{"), rawText.lastIndexOf("}") + 1);
      aiOutput = JSON.parse(jsonStr);
    } catch {
      return NextResponse.json({ message: "AI returned malformed output." }, { status: 502 });
    }

    const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
    const baseStartTime = new Date(`2000-01-01T${startTime}:00`);
    const periodDuration = Number(settings.periodDuration) || 45;

    const bulkOps = [];

    for (const classObj of classes) {
      const cid = classObj._id.toString();
      const grid = aiOutput[cid];
      if (!grid || !Array.isArray(grid)) continue;

      const schedule = [];
      for (let d = 0; d < 5; d++) {
        const daySlots = grid[d] || [];
        const periods = [];
        let currentPeriodTime = new Date(baseStartTime);

        for (let p = 0; p < periodsPerDay; p++) {
          const slot = daySlots[p];
          let subject = null, teacher = null, name = "Free Period";

          if (typeof slot === "string" && slot.includes(":")) {
            const parts = slot.split(":");
            if (isValidObjectId(parts[0]) && isValidObjectId(parts[1])) {
              subject = parts[0];
              teacher = parts[1];
              name = null as any;
            }
          }

          const periodStart = currentPeriodTime.toTimeString().substring(0, 5);
          currentPeriodTime.setMinutes(currentPeriodTime.getMinutes() + periodDuration);
          const periodEnd = currentPeriodTime.toTimeString().substring(0, 5);

          periods.push({ subject, teacher, startTime: periodStart, endTime: periodEnd, name });
        }
        schedule.push({ day: daysOfWeek[d], periods });
      }

      bulkOps.push({
        updateOne: {
          filter: { school: schoolId, class: cid, academicYear: academicYearId, term },
          update: { $set: { schedule } },
          upsert: true
        }
      });
    }

    if (bulkOps.length > 0) {
      await Timetable.bulkWrite(bulkOps);
    }

    // Increment usage
    school.aiTimetableUsage = { date: new Date(), count: currentUsage + 1 };
    await school.save();

    logActivity({
      userId: authUser._id.toString(),
      action: "Bulk Generated Timetables",
      details: `Generated timetables for ${bulkOps.length} classes`,
    }).catch(() => {});

    return NextResponse.json({ message: "Bulk generation successful", count: bulkOps.length }, { status: 201 });
  } catch (error: any) {
    console.error("[Bulk Timetable] Error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
