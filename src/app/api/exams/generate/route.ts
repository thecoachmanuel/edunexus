export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { connectDB } from "@/lib/db";
import Exam from "@/lib/models/exam";
import { getAuthUser } from "@/middleware/auth";
import { logActivity } from "@/lib/utils/activitieslog";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY as string);

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    
    const authUser = await getAuthUser(req, ["admin", "teacher"]);
    if (!authUser) {
      return NextResponse.json({ message: "Not authorized" }, { status: 401 });
    }

    const body = await req.json();
    const { title, topic, difficulty, count, subject, class: classId, academicYear, term } = body;

    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return NextResponse.json(
        { message: "Google Gemini API Key is missing" },
        { status: 500 }
      );
    }

    const prompt = `
      You are an expert educator. Create a quiz about "${topic}" at a "${difficulty}" difficulty level.
      Generate exactly ${count} multiple-choice questions.
      
      You must respond ONLY with a valid JSON array of objects. Do NOT include markdown blocks like \`\`\`json.
      The JSON array should have the following structure:
      [
        {
          "questionText": "The actual question here?",
          "type": "MCQ",
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "correctAnswer": "Option B",
          "points": 1
        }
      ]
      Make sure the options are clear, and the correctAnswer EXACTLY MATCHES one of the strings in the options array.
    `;

    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      generationConfig: { responseMimeType: "application/json" }
    });
    const result = await model.generateContent(prompt);
    let textResponse = result.response.text();
    
    // Clean up response if it contains markdown formatting
    textResponse = textResponse.trim();
    if (textResponse.startsWith("```json")) {
      textResponse = textResponse.replace(/^```json\n?/, "").replace(/\n?```$/, "").trim();
    }
    
    let generatedQuestions = [];
    try {
      generatedQuestions = JSON.parse(textResponse);
    } catch (parseError) {
      console.error("AI JSON Parse Error:", textResponse);
      return NextResponse.json(
        { message: "Failed to parse AI response. Please try again." },
        { status: 500 }
      );
    }

    // Defensive sanitization of generated questions to prevent validation/schema errors
    const sanitizedQuestions = (Array.isArray(generatedQuestions) ? generatedQuestions : []).map((q: any) => ({
      questionText: q.questionText || q.question || "Untitled Question",
      type: q.type || "MCQ",
      options: Array.isArray(q.options) ? q.options.map(String) : [],
      correctAnswer: String(q.correctAnswer || q.answer || ""),
      points: Number(q.points) || 1,
    }));

    // Now save to the database
    const newExam = await Exam.create({
      school: authUser.schoolContext._id,
      title,
      subject,
      class: classId,
      academicYear,
      term,
      teacher: authUser._id,
      duration: count * 2, // 2 mins per question default
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
      isActive: false,
      questions: sanitizedQuestions,
    });

    await logActivity({
      userId: authUser._id.toString(),
      action: "Generated AI Quiz",
      details: `Topic: ${topic} (${count} questions)`,
    });

    return NextResponse.json(newExam, { status: 201 });
  } catch (error) {
    console.error("EXAM GENERATE ERROR", error);
    return NextResponse.json({ message: "Server Error", error }, { status: 500 });
  }
}
