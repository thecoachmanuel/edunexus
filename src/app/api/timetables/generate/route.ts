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
        if (!teacher.teacherSubject) return false;
        return teacher.teacherSubject.some((subId: any) =>
          classSubjectIds.includes(subId.toString())
        );
      })
      .map((tea) => ({
        id: tea._id.toString(),
        name: tea.name,
        subjects: tea.teacherSubject ? tea.teacherSubject.map((s: any) => s.toString()) : [],
      }));

    let isUsingFallbackTeachers = false;
    if (qualifiedTeachers.length === 0) {
      isUsingFallbackTeachers = true;
      qualifiedTeachers = allTeachers.map((tea) => ({
        id: tea._id.toString(),
        name: tea.name,
        subjects: tea.teacherSubject ? tea.teacherSubject.map((s: any) => s.toString()) : [],
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
      5. Output strict JSON only. Schema:
         {
           "schedule": [
             {
               "day": "Monday",
               "periods": [
                 { "subject": "SUBJECT_ID", "teacher": "TEACHER_ID", "startTime": "HH:MM", "endTime": "HH:MM" }
               ]
             }
           ]
         }
    `;

    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY as string);
    const activeModel = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      generationConfig: {
        responseMimeType: "application/json"
      }
    });

    const result = await activeModel.generateContent(prompt);
    const text = result.response.text();

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

    // --- Step 4: Save the timetable ---
    await Timetable.findOneAndDelete({ class: classId, academicYear: academicYearId });
    const newTimetable = await Timetable.create({
      class: classId,
      academicYear: academicYearId,
      schedule: aiSchedule.schedule,
    });

    await logActivity({
      userId: authUser._id.toString(),
      action: "Generated Timetable",
      details: `Generated timetable for class ${classData.name}`,
    });

    return NextResponse.json(
      { message: "Timetable generated successfully", timetable: newTimetable },
      { status: 201 }
    );
  } catch (error) {
    console.error("TIMETABLE GENERATE ERROR", error);
    return NextResponse.json({ message: "Server Error", error }, { status: 500 });
  }
}
