import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Timetable from "@/lib/models/timetable";
import ClassModel from "@/lib/models/class";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const { classId, academicYearId, term, day, startTime, endTime, clashingTeacherId } = body;

    if (!classId || !academicYearId || !term || !day || !startTime) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    await dbConnect();

    // 1. Fetch Target Timetable
    const existingTimetable = await Timetable.findOne({ class: classId, academicYear: academicYearId, term }).lean();
    if (!existingTimetable) {
      return NextResponse.json({ message: "Timetable not found for class" }, { status: 404 });
    }

    const classData = await ClassModel.findById(classId).lean();

    // 2. Build Teacher Clash Map
    const allTimetables = await Timetable.find({ academicYear: academicYearId, term }).lean();
    const teacherClashMap: Record<string, { day: string; startTime: string; endTime: string }[]> = {};
    for (const tt of allTimetables) {
      if (String(tt.class) === String(classId)) continue; 
      for (const daySchedule of tt.schedule || []) {
        for (const period of daySchedule.periods || []) {
          if (!period.teacher) continue;
          const tid = period.teacher.toString();
          if (!teacherClashMap[tid]) teacherClashMap[tid] = [];
          teacherClashMap[tid].push({
            day: daySchedule.day,
            startTime: period.startTime,
            endTime: period.endTime,
          });
        }
      }
    }

    const clashSummary = Object.keys(teacherClashMap).length > 0
      ? JSON.stringify(teacherClashMap)
      : "No other classes scheduled yet.";

    // 3. Prompt for Surgical Swap
    const prompt = `
You are a surgical AI timetable auditor for ${classData?.name || "a class"}.

I am providing you with a complete JSON timetable for a class.
CRITICAL ERROR: There is a severe Teacher Clash detected on ${day} between ${startTime} and ${endTime}. 
Teacher ID "${clashingTeacherId}" is double-booked across the school.

YOUR MISSION:
Swap the subject/teacher assignment of the clashing period with ANOTHER valid teaching period in this same timetable to resolve the conflict.

TEACHER CLASH MAP (teacherId -> list of already-booked slots in other classes):
${clashSummary}

STRICT RULES:
1. ONLY swap subject/teacher assignments between two slots. 
2. Do NOT add, remove, or modify the duration, day, or startTime/endTime of the structural periods.
3. The total frequency/count of subjects/teachers in the week MUST remain exactly the same as the original.
4. Ensure the newly swapped teachers do NOT clash with the TEACHER CLASH MAP for their new time slots.
5. "subject" and "teacher" values MUST remain exactly the 24-character hex ObjectIds.
6. Do NOT touch break periods.

EXISTING TIMETABLE TO FIX:
${JSON.stringify(existingTimetable.schedule)}

OUTPUT: Return ONLY valid JSON, no markdown, no explanation. Schema:
{
  "schedule": [
    {
      "day": "Monday",
      "periods": [
        { "subject": "<24-char-hex-objectid>", "teacher": "<24-char-hex-objectid>", "startTime": "HH:MM", "endTime": "HH:MM", "name": null }
      ]
    }
  ]
}
    `.trim();

    // 4. Call Gemini with Retries
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY as string);
    const activeModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    let attempts = 0;
    const maxAttempts = 3;
    let currentPrompt = prompt;
    let finalSanitizedSchedule: any = null;

    const isValidObjectId = (id: any) => typeof id === "string" && /^[0-9a-fA-F]{24}$/.test(id);

    try {
      while (attempts < maxAttempts) {
        attempts++;
        console.log(`[Timetable Fix] Attempt ${attempts}...`);

        try {
          const generateWithTimeout = Promise.race([
            activeModel.generateContent(currentPrompt),
            new Promise<never>((_, reject) => setTimeout(() => reject(new Error("AI request timed out.")), 60000)),
          ]);

          const result = await generateWithTimeout as any;
          const text = result.response.text();

          const jsonStart = text.indexOf("{");
          const jsonEnd = text.lastIndexOf("}");
          if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) throw new Error("No JSON found");

          const aiSchedule = JSON.parse(text.substring(jsonStart, jsonEnd + 1));
          if (!aiSchedule || !Array.isArray(aiSchedule.schedule)) throw new Error("Invalid schedule array.");

          // Validate
          let validationError = "";
          const sanitizedSchedule = aiSchedule.schedule.map((d: any) => ({
            day: d.day,
            periods: (d.periods || []).map((period: any) => {
              const isBreak = !!period.name && !isValidObjectId(period.subject) && !isValidObjectId(period.teacher);
              let subject = isValidObjectId(period.subject) ? period.subject : null;
              let teacher = isValidObjectId(period.teacher) ? period.teacher : null;

              if (!isBreak && (!subject || !teacher)) {
                validationError += `Missing ObjectId for subject/teacher on ${d.day} at ${period.startTime}. `;
              }

              if (teacher && teacherClashMap[teacher]) {
                const clash = teacherClashMap[teacher].find(c => c.day === d.day && c.startTime === period.startTime);
                if (clash) {
                  validationError += `Teacher ${teacher} clashes on ${d.day} at ${period.startTime}. `;
                }
              }

              return { subject, teacher, startTime: period.startTime, endTime: period.endTime, name: period.name || null };
            }),
          }));

          if (validationError && attempts < maxAttempts) {
            console.log(`[Timetable Fix] Validation failed: ${validationError}`);
            currentPrompt += `\n\nVALIDATION FAILED ON PREVIOUS ATTEMPT. Fix these issues: ${validationError}`;
            continue;
          }

          finalSanitizedSchedule = sanitizedSchedule;
          break;

        } catch (err: any) {
          console.error(`[Timetable Fix] Attempt ${attempts} failed:`, err.message);
          if (err.message.toLowerCase().includes("quota") || err.message.includes("429")) {
            await new Promise(resolve => setTimeout(resolve, 15000));
          }
          if (attempts === maxAttempts) throw err;
        }
      }
    } catch (routeErr: any) {
      if (routeErr.message && routeErr.message.toLowerCase().includes("quota")) {
        return NextResponse.json({ message: "AI Quota Exceeded." }, { status: 429 });
      }
      return NextResponse.json({ message: "Fix failed due to server error", error: routeErr.message }, { status: 500 });
    }

    if (!finalSanitizedSchedule) {
      return NextResponse.json({ message: "AI failed to find a valid swap without causing new clashes." }, { status: 500 });
    }

    // 5. Save
    await Timetable.findOneAndUpdate(
      { class: classId, academicYear: academicYearId, term },
      { schedule: finalSanitizedSchedule },
      { new: true }
    );

    return NextResponse.json({ message: "Timetable clash successfully resolved by AI!" }, { status: 200 });

  } catch (error: any) {
    console.error("[Timetable Fix]", error);
    return NextResponse.json({ message: "Server Error", error: error.message }, { status: 500 });
  }
}
