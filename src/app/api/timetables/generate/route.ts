export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Class from "@/lib/models/class";
import User from "@/lib/models/user";
import Timetable from "@/lib/models/timetable";
import Subject from "@/lib/models/subject";
import AcademicYear from "@/lib/models/academicYear";
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

    // --- Step 2: Fetch existing timetables to avoid teacher clashes ---
    const allTimetables = await Timetable.find({ academicYear: academicYearId, term }).lean();

    console.log("[Timetable] Subjects:", subjectsPayload.length, "Teachers:", qualifiedTeachers.length);
    // --- Step 3: Generate timetable with AI ---
    const breaksDescription = settings.breaks && settings.breaks.length > 0
      ? settings.breaks
          .map((b: any) => `"${b.name}" at ${b.startTime} for ${b.duration} minutes`)
          .join(", ")
      : "No custom breaks specified. Use your judgment to place one short break (10 min) and one lunch break (30 min) at sensible times.";

    const weightsDescription = settings.subjectWeights && Object.keys(settings.subjectWeights).length > 0
      ? "CRITICAL: You MUST strictly adhere to the following exact period counts for the week: " + 
        Object.entries(settings.subjectWeights).map(([id, count]) => {
          const subject = subjectsPayload.find((s: any) => s._id === id);
          return subject ? `"${subject.name}" (${id}) MUST appear EXACTLY ${count} times` : "";
        }).filter(Boolean).join(". ")
      : "The total number of teaching periods in the week MUST be divided as evenly as possible among ALL available subjects. For example, if there are 40 teaching periods and 8 subjects, each subject MUST appear exactly 5 times.";

    const prompt = `
      You are a school scheduler. Generate a weekly timetable (Monday to Friday).

      CONTEXT:
      - Class: ${classData.name}
      - School Hours: ${settings.startTime} to ${settings.endTime}
      - Periods per Day: ${settings.periods}
      - Each Period Duration: ${settings.periodDuration || 45} minutes

      RESOURCES:
      - Subjects: ${JSON.stringify(subjectsPayload)}
      - Teachers: ${JSON.stringify(qualifiedTeachers)}
      - Other Timetables (for clash detection): ${JSON.stringify(allTimetables)}

      STRICT RULES:
      1. CRITICAL: You MUST use EVERY SINGLE subject provided in the RESOURCES. ${weightsDescription} You MUST verify that NO subject is left out (unless a specific count is set to 0).
      2. Assign a valid Teacher to every Subject period.
      ${isUsingFallbackTeachers ? "3. Since no teachers are specifically mapped to these subjects, you may assign any listed teacher to any subject." : "3. Prefer assigning teachers whose subject list includes the subject being scheduled."}
      4. Schedule the following breaks EXACTLY as defined: ${breaksDescription}. For these break periods, set "subject" to null, "teacher" to null, and set "name" to the name of the break (e.g. "Lunch").
      5. Each teaching period must be exactly ${settings.periodDuration || 45} minutes long (unless interrupted by a break).
      6. Avoid teacher clashes (a teacher cannot appear in two classes at the same time).
      7. CRITICAL: Do NOT schedule ANY extra "Free Periods" or empty slots. Every single period that is not a designated break MUST be assigned a valid subject and teacher. Fill 100% of the available teaching time with subjects from the RESOURCES, distributing them evenly.
      8. Output strict JSON only.
         - "subject" and "teacher" MUST be the exact 24-character hexadecimal ObjectId strings from the resources.
         - For Break or Lunch Periods: set "subject" to null, "teacher" to null, and set "name" to the break's name.
         - Do NOT use plain text names for subject or teacher fields.
         Schema:
         {
           "schedule": [
             {
               "day": "Monday",
               "periods": [
                 { "subject": "24_CHAR_SUBJECT_OBJECTID_OR_NULL", "teacher": "24_CHAR_TEACHER_OBJECTID_OR_NULL", "startTime": "HH:MM", "endTime": "HH:MM", "name": "Optional Break Name" }
               ]
             }
           ]
         }
    `;

    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY as string);
    const activeModel = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json"
      }
    });

    console.log("[Timetable] Sending prompt to Gemini...");
    const result = await activeModel.generateContent(prompt);
    const text = result.response.text();
    console.log("[Timetable] AI response received, length:", text.length);

    let aiSchedule: any;
    try {
      const jsonStart = text.indexOf("{");
      const jsonEnd = text.lastIndexOf("}");
      let jsonString = text;
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        jsonString = text.substring(jsonStart, jsonEnd + 1);
      }
      aiSchedule = JSON.parse(jsonString);
    } catch (parseError) {
      console.error("AI response JSON parsing failed:", text, parseError);
      return NextResponse.json(
        { message: "Failed to generate a valid JSON timetable structure from AI. Please try again.", error: parseError },
        { status: 500 }
      );
    }

    if (!aiSchedule || !Array.isArray(aiSchedule.schedule)) {
      console.error("AI Response lacks schedule array:", aiSchedule);
      return NextResponse.json(
        { message: "AI response did not match the expected timetable format." },
        { status: 500 }
      );
    }

    // Sanitize AI schedule to prevent Cast/Validation Errors on non-ObjectId values (like "Break", "Lunch", "None", or empty strings)
    const isValidObjectId = (id: any) => typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id);

    const sanitizedSchedule = aiSchedule.schedule.map((day: any) => ({
      day: day.day,
      periods: (day.periods || []).map((period: any) => ({
        subject: period.subject && isValidObjectId(period.subject) ? period.subject : null,
        teacher: period.teacher && isValidObjectId(period.teacher) ? period.teacher : null,
        startTime: period.startTime,
        endTime: period.endTime,
        name: period.name || null
      }))
    }));

    // --- Step 4: Save the timetable (atomic upsert to avoid duplicate key errors from the unique class+year index) ---
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

    // Populate all details so the frontend receives a ready-to-render structure on success!
    const newTimetable = await Timetable.findById(updatedTimetable._id)
      .populate("academicYear")
      .populate("schedule.periods.subject")
      .populate("schedule.periods.teacher")
      .lean();

    console.log("[Timetable] Saved successfully. Populated timetable id:", newTimetable?._id);

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
    const isOverloaded = errMessage.includes("503") || errMessage.includes("overloaded") || errMessage.includes("high demand");
    const isQuota = errMessage.includes("429") || errMessage.includes("quota");
    console.error("TIMETABLE GENERATE ERROR", errMessage);
    if (isOverloaded) {
      return NextResponse.json({ message: "The AI model is currently overloaded. Please wait a moment and try again." }, { status: 503 });
    }
    if (isQuota) {
      return NextResponse.json({ message: "AI quota exceeded. Please try again later." }, { status: 429 });
    }
    return NextResponse.json({ message: errMessage || "Server Error" }, { status: 500 });
  }
}
