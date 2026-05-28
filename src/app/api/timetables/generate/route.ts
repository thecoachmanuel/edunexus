import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Class from "@/lib/models/class";
import User from "@/lib/models/user";
import Timetable from "@/lib/models/timetable";
import { getAuthUser } from "@/middleware/auth";
import { logActivity } from "@/lib/utils/activitieslog";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const authUser = await getAuthUser(req, ["admin"]);
    if (!authUser) {
      return NextResponse.json({ message: "Not authorized" }, { status: 401 });
    }

    const { classId, academicYearId, settings } = await req.json();

    if (!classId || !academicYearId || !settings) {
      return NextResponse.json(
        { message: "classId, academicYearId, and settings are required" },
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
    const classData = await Class.findById(classId).populate("subjects");
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
    const allTimetables = await Timetable.find({ academicYear: academicYearId }).lean();

    console.log("[Timetable] Subjects:", subjectsPayload.length, "Teachers:", qualifiedTeachers.length);
    // --- Step 3: Generate timetable with AI ---
    const prompt = `
      You are a school scheduler. Generate a weekly timetable (Monday to Friday).

      CONTEXT:
      - Class: ${classData.name}
      - Hours: ${settings.startTime} to ${settings.endTime} (${settings.periods} periods/day).

      RESOURCES:
      - Subjects: ${JSON.stringify(subjectsPayload)}
      - Teachers: ${JSON.stringify(qualifiedTeachers)}
      - Other Timetables: ${JSON.stringify(allTimetables)}

      STRICT RULES:
      1. Assign a Teacher to every Subject period.
      ${isUsingFallbackTeachers ? "2. Since there are no teachers specifically mapped to these subjects, you may assign any of the listed teachers to any subject." : "2. Teacher MUST have the subject ID in their list if possible."}
      3. Break Time/Free Period after every 2 periods (10 minutes), Lunch Time after 5 periods (at 12:00) (30 minutes).
      4. Avoid clashes with other classes (teacher can't be in two classes at the same time).
      5. Output strict JSON only.
         - The value of "subject" and "teacher" MUST be the exact 24-character hexadecimal ObjectId string from the resources provided.
         - For Break, Lunch, or Free Periods, set "subject" to null and "teacher" to null.
         - Do not invent, hallucinate, or use plain text names (like "Mathematics" or "Break" or "None") for the subject or teacher fields.
         Schema:
         {
           "schedule": [
             {
               "day": "Monday",
               "periods": [
                 { "subject": "24_CHAR_SUBJECT_OBJECTID_OR_NULL", "teacher": "24_CHAR_TEACHER_OBJECTID_OR_NULL", "startTime": "HH:MM", "endTime": "HH:MM" }
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
    const isValidObjectId = (id: string) => /^[0-9a-fA-F]{24}$/.test(id);

    const sanitizedSchedule = aiSchedule.schedule.map((day: any) => ({
      day: day.day,
      periods: (day.periods || []).map((period: any) => ({
        subject: period.subject && isValidObjectId(period.subject) ? period.subject : null,
        teacher: period.teacher && isValidObjectId(period.teacher) ? period.teacher : null,
        startTime: period.startTime,
        endTime: period.endTime,
      })),
    }));

    // --- Step 4: Save the timetable (atomic upsert to avoid duplicate key errors from the unique class+year index) ---
    console.log("[Timetable] Saving sanitized schedule with", sanitizedSchedule.length, "days...");
    const upsertedTimetable = await Timetable.findOneAndUpdate(
      { class: classId, academicYear: academicYearId },
      { $set: { schedule: sanitizedSchedule } },
      { upsert: true, new: true }
    );

    // Populate all details so the frontend receives a ready-to-render structure on success!
    const newTimetable = await Timetable.findById(upsertedTimetable._id)
      .populate("academicYear")
      .populate("schedule.periods.subject")
      .populate("schedule.periods.teacher");

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
