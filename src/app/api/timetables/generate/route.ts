export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Class from "@/lib/models/class";
import User from "@/lib/models/user";
import Timetable from "@/lib/models/timetable";
import { getAuthUser } from "@/middleware/auth";
import { logActivity } from "@/lib/utils/activitieslog";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { aiRateLimiter } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const authUser = await getAuthUser(req, ["admin"]);
    if (!authUser) {
      return NextResponse.json({ message: "Not authorized" }, { status: 401 });
    }

    // Apply Rate Limiting (10 requests per minute per user)
    const rateLimit = aiRateLimiter.check(authUser._id.toString());
    if (!rateLimit.success) {
      return NextResponse.json(
        { message: "Too many AI timetable requests. Please try again in a minute." },
        { status: 429 }
      );
    }

    const { classId, academicYearId, term, settings } = await req.json();

    if (!classId || !academicYearId || !term || !settings) {
      return NextResponse.json(
        { message: "classId, academicYearId, term, and settings are required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { message: "GOOGLE_GENERATIVE_AI_API_KEY is missing" },
        { status: 500 }
      );
    }

    // --- Step 1: Fetch class context ---
    const classData = await Class.findById(classId).populate("subjects").lean();
    if (!classData) {
      return NextResponse.json({ message: "Class not found" }, { status: 404 });
    }

    const allTeachers = await User.find({ role: "teacher" }).lean();
    const classSubjectIds = classData.subjects.map((sub: any) =>
      sub._id.toString()
    );

    let qualifiedTeachers = allTeachers
      .filter((teacher) => {
        if (!Array.isArray(teacher.teacherSubject)) return false;
        return teacher.teacherSubject.some((subId: any) =>
          classSubjectIds.includes(subId.toString())
        );
      })
      .map((tea) => ({
        id: tea._id.toString(),
        name: tea.name,
        subjects: Array.isArray(tea.teacherSubject) ? tea.teacherSubject.map((s: any) => s.toString()) : [],
      }));

    let isUsingFallbackTeachers = false;
    if (qualifiedTeachers.length === 0) {
      isUsingFallbackTeachers = true;
      qualifiedTeachers = allTeachers.map((tea) => ({
        id: tea._id.toString(),
        name: tea.name,
        subjects: Array.isArray(tea.teacherSubject) ? tea.teacherSubject.map((s: any) => s.toString()) : [],
      }));
    }

    const subjectsPayload = classData.subjects.map((sub: any) => ({
      id: sub._id.toString(),
      name: sub.name,
      code: sub.code,
    }));

    if (subjectsPayload.length === 0 || qualifiedTeachers.length === 0) {
      return NextResponse.json(
        { message: "No Subjects or Teachers assigned to this class" },
        { status: 400 }
      );
    }

    // --- Step 2: Fetch existing timetables — build a compact clash summary ---
    // Do NOT send full documents to AI (they are huge and blow context limits).
    // Instead build a minimal map: { teacherId -> [ { day, startTime, endTime } ] }
    const allTimetables = await Timetable.find({ academicYear: academicYearId, term }).lean();
    const teacherClashMap: Record<string, { day: string; startTime: string; endTime: string }[]> = {};
    for (const tt of allTimetables) {
      if (String(tt.class) === String(classId)) continue; // skip the class we're generating for
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

    console.log("[Timetable] Subjects:", subjectsPayload.length, "Teachers:", qualifiedTeachers.length);

    // --- Step 3: Build prompt ---
    const breaksDescription = settings.breaks && settings.breaks.length > 0
      ? settings.breaks
          .map((b: any) => `"${b.name}" at ${b.startTime} for ${b.duration} minutes`)
          .join(", ")
      : "No custom breaks specified. Use your judgment to place one short break (10 min) and one lunch break (30 min) at sensible times.";

    // FIX: subjectsPayload uses key "id" not "_id" — use s.id here
    const weightsDescription = settings.subjectWeights && Object.keys(settings.subjectWeights).length > 0
      ? "CRITICAL: You MUST strictly adhere to the following exact period counts for the week: " +
        Object.entries(settings.subjectWeights).map(([id, count]) => {
          const subject = subjectsPayload.find((s: any) => s.id === id);
          return subject ? `"${subject.name}" (${id}) MUST appear EXACTLY ${count} times` : "";
        }).filter(Boolean).join(". ")
      : "The total number of teaching periods in the week MUST be divided as evenly as possible among ALL available subjects. For example, if there are 40 teaching periods and 8 subjects, each subject MUST appear exactly 5 times.";

    const clashSummary = Object.keys(teacherClashMap).length > 0
      ? JSON.stringify(teacherClashMap)
      : "No other classes scheduled yet — no clashes to avoid.";

    const prompt = `
You are a school timetable scheduler. Generate a weekly timetable (Monday to Friday).

CONTEXT:
- Class: ${classData.name}
- School Hours: ${settings.startTime} to ${settings.endTime}
- Periods per Day: ${settings.periods}
- Each Period Duration: ${settings.periodDuration || 45} minutes

RESOURCES:
- Subjects (use field "id" as the ObjectId):
${JSON.stringify(subjectsPayload)}
- Teachers (use field "id" as the ObjectId):
${JSON.stringify(qualifiedTeachers)}

TEACHER CLASH MAP (teacherId -> list of already-booked slots in other classes):
${clashSummary}

STRICT RULES:
1. CRITICAL: Use EVERY subject in the RESOURCES list. ${weightsDescription}
2. Assign a teacher to every teaching period.
${isUsingFallbackTeachers ? "3. No teacher-subject mapping available — assign any teacher to any subject." : "3. Prefer teachers whose subject list includes the subject."}
4. Breaks: ${breaksDescription}. For break periods set subject=null, teacher=null, and name to the break name.
5. Do NOT create free/empty periods — every non-break slot MUST have a subject and teacher.
6. Avoid teacher clashes using the TEACHER CLASH MAP above.
7. CRITICAL: Every period in a single day MUST have a UNIQUE startTime and endTime. Do NOT schedule multiple subjects/teachers for the exact same time slot in this class.
8. IMPORTANT: "subject" and "teacher" values MUST be the exact 24-character hex ObjectId strings from the "id" fields in RESOURCES. Do NOT use names.

OUTPUT: Return ONLY valid JSON, no markdown, no explanation. Schema:
{
  "schedule": [
    {
      "day": "Monday",
      "periods": [
        { "subject": "<24-char-hex-objectid-or-null>", "teacher": "<24-char-hex-objectid-or-null>", "startTime": "HH:MM", "endTime": "HH:MM", "name": "<optional break name>" }
      ]
    }
  ]
}
    `.trim();

    // --- Step 4: Call Gemini with Retries ---
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY as string);
    const activeModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    let attempts = 0;
    const maxAttempts = 3;
    let currentPrompt = prompt;
    let finalSanitizedSchedule: any = null;

    const isValidObjectId = (id: any) => typeof id === "string" && /^[0-9a-fA-F]{24}$/.test(id);

    while (attempts < maxAttempts) {
      attempts++;
      console.log(`[Timetable] Attempt ${attempts}: Sending prompt to Gemini...`);

      try {
        const generateWithTimeout = Promise.race([
          activeModel.generateContent(currentPrompt),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("AI request timed out after 90 seconds.")), 90000)
          ),
        ]);

        const result = await generateWithTimeout as Awaited<ReturnType<typeof activeModel.generateContent>>;
        const text = result.response.text();

        if (!text || text.trim().length === 0) {
          throw new Error("AI returned an empty response.");
        }

        const jsonStart = text.indexOf("{");
        const jsonEnd = text.lastIndexOf("}");
        if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
          throw new Error("No JSON object found in AI response");
        }

        const jsonString = text.substring(jsonStart, jsonEnd + 1);
        const aiSchedule = JSON.parse(jsonString);

        if (!aiSchedule || !Array.isArray(aiSchedule.schedule)) {
          throw new Error("AI response did not contain a valid schedule array.");
        }

        // --- Step 5: Validate and Sanitize ---
        let validationError = "";
        
        const sanitizedSchedule = aiSchedule.schedule.map((day: any) => {
          return {
            day: day.day,
            periods: (day.periods || []).map((period: any) => {
              const isBreak = !!period.name && !isValidObjectId(period.subject) && !isValidObjectId(period.teacher);
              
              let subject = isValidObjectId(period.subject) ? period.subject : null;
              let teacher = isValidObjectId(period.teacher) ? period.teacher : null;
              
              if (!isBreak && (!subject || !teacher)) {
                validationError += `Missing valid ObjectId for subject or teacher on ${day.day} at ${period.startTime}. `;
              }
              
              // Validate mathematical clash
              if (teacher && teacherClashMap[teacher]) {
                const clash = teacherClashMap[teacher].find(c => c.day === day.day && c.startTime === period.startTime);
                if (clash) {
                  validationError += `CRITICAL CLASH: Teacher ${teacher} is already booked on ${day.day} at ${period.startTime} in another class. You MUST choose a different teacher. `;
                }
              }
              
              return {
                subject,
                teacher,
                startTime: period.startTime,
                endTime: period.endTime,
                name: period.name || null,
              };
            }),
          };
        });

        // Check if there are validation errors
        if (validationError && attempts < maxAttempts) {
          console.log(`[Timetable] Validation failed on attempt ${attempts}: ${validationError}`);
          currentPrompt += `\n\nVALIDATION FAILED ON PREVIOUS ATTEMPT. Fix these issues: ${validationError}`;
          continue; // Retry with feedback
        }

        // If valid or out of attempts
        finalSanitizedSchedule = sanitizedSchedule;
        break;

      } catch (err: any) {
        console.error(`[Timetable] Attempt ${attempts} failed:`, err.message);
        if (attempts === maxAttempts) {
          throw err;
        }
      }
    }

    if (!finalSanitizedSchedule) {
      return NextResponse.json(
        { message: "AI failed to generate a valid timetable after multiple attempts. Please try again." },
        { status: 500 }
      );
    }

    // --- Step 6: Graceful Fallback (Study Hall) ---
    // If the AI ran out of attempts and still left flaws, we convert them to Study/Free Periods
    // rather than throwing a complete error or saving a database clash.
    finalSanitizedSchedule = finalSanitizedSchedule.map((day: any) => ({
      ...day,
      periods: day.periods.map((period: any) => {
        const isBreak = !!period.name && !period.subject && !period.teacher;
        let isClashing = false;
        
        if (period.teacher && teacherClashMap[period.teacher]) {
          isClashing = teacherClashMap[period.teacher].some(c => c.day === day.day && c.startTime === period.startTime);
        }
        
        if (!isBreak && (!period.subject || !period.teacher || isClashing)) {
          // Fallback
          return {
            ...period,
            subject: null,
            teacher: null,
            name: "Study / Free Period"
          };
        }
        return period;
      })
    }));

    // --- Step 7: Save (atomic upsert) ---
    console.log("[Timetable] Saving sanitized schedule with", sanitizedSchedule.length, "days...");
    const updatedTimetable = await Timetable.findOneAndUpdate(
      { class: classId, academicYear: academicYearId, term },
      {
        class: classId,
        academicYear: academicYearId,
        term,
        schedule: sanitizedSchedule,
      },
      { new: true, upsert: true }
    );

    // Populate for the response
    const newTimetable = await Timetable.findById(updatedTimetable._id)
      .populate("academicYear")
      .populate("schedule.periods.subject")
      .populate("schedule.periods.teacher")
      .lean();

    console.log("[Timetable] Saved successfully. id:", newTimetable?._id);

    await logActivity({
      userId: authUser._id.toString(),
      action: "Generated Timetable",
      details: `Generated timetable for class ${classData.name}`,
    });

    return NextResponse.json(
      { message: "Timetable generated successfully", timetable: newTimetable },
      { status: 201 }
    );
  } catch (error: any) {
    const errMessage = error?.message || String(error);
    const isOverloaded =
      errMessage.includes("503") ||
      errMessage.includes("overloaded") ||
      errMessage.includes("high demand");
    const isQuota =
      errMessage.includes("429") ||
      errMessage.includes("quota");
    const isTimeout = errMessage.includes("timed out");

    console.error("TIMETABLE GENERATE ERROR", errMessage);

    if (isTimeout) {
      return NextResponse.json({ message: errMessage }, { status: 504 });
    }
    if (isOverloaded) {
      return NextResponse.json(
        { message: "The AI model is currently overloaded. Please wait a moment and try again." },
        { status: 503 }
      );
    }
    if (isQuota) {
      return NextResponse.json(
        { message: "AI quota exceeded. Please try again later." },
        { status: 429 }
      );
    }
    return NextResponse.json({ message: errMessage || "Server Error" }, { status: 500 });
  }
}
