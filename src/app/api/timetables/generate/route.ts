export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Class from "@/lib/models/class";
import User from "@/lib/models/user";
import Timetable from "@/lib/models/timetable";
import { getAuthUser } from "@/middleware/auth";
import { logActivity } from "@/lib/utils/activitieslog";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { aiRateLimiter } from "@/lib/rate-limit";

const isValidObjectId = (id: any) =>
  typeof id === "string" && /^[0-9a-fA-F]{24}$/.test(id);

export async function POST(req: NextRequest) {
  let classData: any = null;

  try {
    await connectDB();

    const authUser = await getAuthUser(req, ["admin"]);
    if (!authUser) {
      return NextResponse.json({ message: "Not authorized" }, { status: 401 });
    }

    // Rate limit
    const rateLimit = aiRateLimiter.check(authUser._id.toString());
    if (!rateLimit.success) {
      return NextResponse.json(
        { message: "Too many AI timetable requests. Please wait a moment." },
        { status: 429 }
      );
    }

    // Parse + validate body
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
    }

    const { classId, academicYearId, term, settings } = body;

    if (!classId || !academicYearId || !term || !settings) {
      return NextResponse.json(
        { message: "classId, academicYearId, term, and settings are required" },
        { status: 400 }
      );
    }

    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return NextResponse.json(
        { message: "AI is not configured on this server. Contact support." },
        { status: 500 }
      );
    }

    // ── Step 1: Load class + teachers ─────────────────────────────────────────
    classData = await Class.findById(classId).populate("subjects").lean();
    if (!classData) {
      return NextResponse.json({ message: "Class not found" }, { status: 404 });
    }

    const allTeachers = await User.find({
      school: authUser.schoolContext?._id,
      role: "teacher",
    }).lean();

    const classSubjectIds = (classData.subjects || []).map((s: any) =>
      s._id.toString()
    );

    let qualifiedTeachers = allTeachers
      .filter((t) =>
        Array.isArray(t.teacherSubject) &&
        t.teacherSubject.some((sid: any) => classSubjectIds.includes(sid.toString()))
      )
      .map((t) => ({
        id: t._id.toString(),
        name: t.name,
      }));

    // Fallback: use all teachers if none matched subjects
    if (qualifiedTeachers.length === 0) {
      qualifiedTeachers = allTeachers.map((t) => ({
        id: t._id.toString(),
        name: t.name,
      }));
    }

    const subjectsPayload = (classData.subjects || []).map((s: any) => ({
      id: s._id.toString(),
      name: s.name,
    }));

    if (subjectsPayload.length === 0) {
      return NextResponse.json(
        { message: "No subjects assigned to this class. Please add subjects first." },
        { status: 400 }
      );
    }
    if (qualifiedTeachers.length === 0) {
      return NextResponse.json(
        { message: "No teachers found in this school. Please add teachers first." },
        { status: 400 }
      );
    }

    // ── Step 2: Build a SLIM clash hint (avoid sending huge data to AI) ───────
    // Only include teachers that are in our qualified pool; keep it compact
    const qualifiedIds = new Set(qualifiedTeachers.map((t) => t.id));
    const allTimetables = await Timetable.find({
      school: authUser.schoolContext?._id,
      academicYear: academicYearId,
      term,
      class: { $ne: classId }, // skip current class
    })
      .select("schedule")
      .lean();

    // Build compact map: teacherId -> Set<"Day_HH:MM">
    const busySlotsMap: Record<string, string[]> = {};
    for (const tt of allTimetables) {
      for (const daySchedule of tt.schedule || []) {
        for (const period of daySchedule.periods || []) {
          if (!period.teacher) continue;
          const tid = period.teacher.toString();
          if (!qualifiedIds.has(tid)) continue; // only track relevant teachers
          const key = `${daySchedule.day}_${period.startTime}`;
          if (!busySlotsMap[tid]) busySlotsMap[tid] = [];
          busySlotsMap[tid].push(key);
        }
      }
    }

    // Trim to max 3 busy slots per teacher to keep prompt small
    const compactClashHint =
      Object.keys(busySlotsMap).length > 0
        ? Object.fromEntries(
            Object.entries(busySlotsMap).map(([tid, slots]) => [
              tid,
              [...new Set(slots)].slice(0, 3), // dedupe + cap
            ])
          )
        : null;

    // ── Step 3: Build lean prompt ─────────────────────────────────────────────
    const startTime = settings.startTime || "08:00";
    const endTime = settings.endTime || "15:00";
    const periodsPerDay = Math.min(Number(settings.periods) || 8, 12);
    const periodDuration = Number(settings.periodDuration) || 45;

    const breaksText =
      settings.breaks && settings.breaks.length > 0
        ? settings.breaks
            .map((b: any) => `"${b.name}" at ${b.startTime} (${b.duration} min)`)
            .join(", ")
        : "Place one 10-min break mid-morning and one 30-min lunch break at noon.";

    const weightsText =
      settings.subjectWeights && Object.keys(settings.subjectWeights).length > 0
        ? Object.entries(settings.subjectWeights)
            .map(([id, count]) => {
              const s = subjectsPayload.find((s: any) => s.id === id);
              return s ? `${s.name}: ${count} times/week` : "";
            })
            .filter(Boolean)
            .join(", ")
        : `Distribute all ${subjectsPayload.length} subjects as evenly as possible across the week.`;

    const clashHintText = compactClashHint
      ? `\nSOFT HINT (teacher busy slots to try to avoid — NOT blocking): ${JSON.stringify(compactClashHint)}`
      : "";

    const prompt = `You are a school timetable generator. Output ONLY a JSON object.

CLASS: ${classData.name}
SCHOOL HOURS: ${startTime}–${endTime} | PERIODS/DAY: ${periodsPerDay} | PERIOD DURATION: ${periodDuration} min

SUBJECTS: ${JSON.stringify(subjectsPayload)}
TEACHERS: ${JSON.stringify(qualifiedTeachers)}
${clashHintText}

RULES:
1. Include ALL ${subjectsPayload.length} subjects. ${weightsText}
2. Assign a valid teacher ID to every non-break period.
3. Use EXACT 24-char hex ObjectId strings from the lists above. Never use names.
4. Breaks: ${breaksText}. Set subject=null, teacher=null for breaks.
5. Every period in a day must have a unique startTime. No overlap within the same class.
6. If a teacher clash is unavoidable, assign them anyway. The Auditor will fix clashes later.
7. Generate for Monday through Friday.

RESPOND WITH ONLY THIS JSON STRUCTURE (no markdown, no explanation):
{"schedule":[{"day":"Monday","periods":[{"subject":"<objectId|null>","teacher":"<objectId|null>","startTime":"HH:MM","endTime":"HH:MM","name":"<break name or null>"}]}]}`;

    // ── Step 4: Call Gemini (single attempt, JSON mode forced) ────────────────
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: { responseMimeType: "application/json" },
    });

    let rawText = "";
    try {
      const raceResult = await Promise.race([
        model.generateContent(prompt),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error("AI_TIMEOUT")),
            50000 // 50s — leaves 10s buffer before Vercel's 60s limit
          )
        ),
      ]);
      rawText = (raceResult as any).response.text();
    } catch (aiErr: any) {
      const msg: string = aiErr?.message || "";
      if (msg === "AI_TIMEOUT") {
        return NextResponse.json(
          { message: "Timetable generation timed out. Try reducing periods per day and try again." },
          { status: 504 }
        );
      }
      if (msg.includes("429") || msg.toLowerCase().includes("quota")) {
        return NextResponse.json(
          { message: "AI quota exceeded. Please wait a moment and try again." },
          { status: 429 }
        );
      }
      if (msg.includes("503") || msg.toLowerCase().includes("overload")) {
        return NextResponse.json(
          { message: "AI model is temporarily overloaded. Please try again in a few seconds." },
          { status: 503 }
        );
      }
      console.error("[Timetable] AI call failed:", msg);
      return NextResponse.json(
        { message: "AI generation failed. Please try again.", detail: msg },
        { status: 502 }
      );
    }

    // ── Step 5: Parse + sanitize ───────────────────────────────────────────────
    if (!rawText || rawText.trim().length === 0) {
      return NextResponse.json(
        { message: "AI returned an empty response. Please try again." },
        { status: 502 }
      );
    }

    let aiSchedule: any;
    try {
      // JSON mode should give clean output, but strip any surrounding markdown just in case
      const jsonStart = rawText.indexOf("{");
      const jsonEnd = rawText.lastIndexOf("}");
      const jsonStr = jsonStart !== -1 && jsonEnd > jsonStart
        ? rawText.substring(jsonStart, jsonEnd + 1)
        : rawText;
      aiSchedule = JSON.parse(jsonStr);
    } catch (parseErr) {
      console.error("[Timetable] JSON parse failed. Raw text:", rawText.slice(0, 500));
      return NextResponse.json(
        { message: "AI returned malformed output. Please try again." },
        { status: 502 }
      );
    }

    if (!Array.isArray(aiSchedule?.schedule)) {
      return NextResponse.json(
        { message: "AI output was missing the schedule. Please try again." },
        { status: 502 }
      );
    }

    // Sanitize each period — keep clashes, only fix missing/invalid ObjectIds
    const sanitizedSchedule = aiSchedule.schedule.map((day: any) => ({
      day: day.day,
      periods: (day.periods || []).map((period: any) => {
        const isBreak =
          !!period.name &&
          !isValidObjectId(period.subject) &&
          !isValidObjectId(period.teacher);

        const subject = isValidObjectId(period.subject) ? period.subject : null;
        const teacher = isValidObjectId(period.teacher) ? period.teacher : null;

        // Only turn into free period if BOTH subject AND teacher are missing on a non-break
        if (!isBreak && !subject && !teacher) {
          return {
            subject: null,
            teacher: null,
            startTime: period.startTime,
            endTime: period.endTime,
            name: "Study / Free Period",
          };
        }

        return {
          subject,
          teacher,
          startTime: period.startTime,
          endTime: period.endTime,
          name: period.name || null,
        };
      }),
    }));

    // ── Step 6: Save (upsert) ─────────────────────────────────────────────────
    console.log(
      `[Timetable] Saving for class ${classData.name} — ${sanitizedSchedule.length} days`
    );

    const saved = await Timetable.findOneAndUpdate(
      {
        school: authUser.schoolContext?._id,
        class: classId,
        academicYear: academicYearId,
        term,
      },
      {
        school: authUser.schoolContext?._id,
        class: classId,
        academicYear: academicYearId,
        term,
        schedule: sanitizedSchedule,
      },
      { new: true, upsert: true }
    );

    const populated = await Timetable.findById(saved._id)
      .populate("academicYear")
      .populate("schedule.periods.subject")
      .populate("schedule.periods.teacher")
      .lean();

    console.log("[Timetable] Saved. id:", populated?._id);

    // Log activity (non-blocking — don't let this fail the request)
    logActivity({
      userId: authUser._id.toString(),
      action: "Generated Timetable",
      details: `Generated timetable for class ${classData.name} (${term})`,
    }).catch(() => {});

    return NextResponse.json(
      { message: "Timetable generated successfully", timetable: populated },
      { status: 201 }
    );
  } catch (error: any) {
    // Final safety net — should not normally reach here
    const msg = error?.message || String(error);
    console.error("[Timetable] Unhandled error:", msg);

    if (msg.includes("429") || msg.toLowerCase().includes("quota")) {
      return NextResponse.json({ message: "AI quota exceeded. Please try again later." }, { status: 429 });
    }
    if (msg.includes("503") || msg.toLowerCase().includes("overload")) {
      return NextResponse.json({ message: "AI model overloaded. Please try again in a moment." }, { status: 503 });
    }

    return NextResponse.json(
      {
        message: `Timetable generation failed: ${msg || "Unknown server error"}`,
      },
      { status: 500 }
    );
  }
}
