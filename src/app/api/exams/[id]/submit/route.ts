import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Exam from "@/lib/models/exam";
import Submission from "@/lib/models/submission";
import { getAuthUser } from "@/middleware/auth";
import { logActivity } from "@/lib/utils/activitieslog";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY as string);

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const authUser = await getAuthUser(req, ["student"]);
    if (!authUser) return NextResponse.json({ message: "Not authorized" }, { status: 401 });

    const { id } = await params;
    const { answers } = await req.json();

    const exam = await Exam.findById(id);
    if (!exam) return NextResponse.json({ message: "Exam not found" }, { status: 404 });

    if (!exam.isActive || new Date() > new Date(exam.dueDate)) {
      return NextResponse.json({ message: "Exam is no longer active" }, { status: 400 });
    }

    const existingSubmission = await Submission.findOne({ exam: id, student: authUser._id });
    if (existingSubmission) {
      return NextResponse.json({ message: "You have already submitted this exam" }, { status: 400 });
    }

    let score = 0;
    const gradedAnswers = answers.map((ans: any) => {
      const question = exam.questions.find((q: any) => q._id.toString() === ans.questionId);
      const isCorrect = question && question.correctAnswer === ans.answer;
      if (isCorrect) score += question.points || 1;
      return {
        questionId: ans.questionId,
        questionText: question?.questionText,
        correctAnswer: question?.correctAnswer,
        answer: ans.answer,
        isCorrect,
        feedback: "",
      };
    });

    const incorrectAnswers = gradedAnswers.filter((a: any) => !a.isCorrect && a.questionText);

    if (incorrectAnswers.length > 0 && process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      try {
        const prompt = `
          You are an AI teacher. A student took an exam and got the following questions wrong.
          Provide a very brief 1-2 sentence explanation for each question on why their answer was wrong, and why the correct answer is right.
          
          Questions:
          ${JSON.stringify(incorrectAnswers.map((a: any) => ({
            id: a.questionId,
            question: a.questionText,
            studentAnswer: a.answer,
            correctAnswer: a.correctAnswer
          })))}
          
          Output STRICT JSON only. Schema:
          [
            { "id": "questionId", "feedback": "Your brief explanation here" }
          ]
        `;

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(prompt);
        const textResponse = result.response.text();
        const cleanJSON = textResponse.replace(/```json/g, "").replace(/```/g, "").trim();
        const feedbackData = JSON.parse(cleanJSON);

        feedbackData.forEach((fb: any) => {
          const ans = gradedAnswers.find((a: any) => a.questionId === fb.id);
          if (ans) {
            ans.feedback = fb.feedback;
          }
        });
      } catch (aiError) {
        console.error("AI FEEDBACK ERROR", aiError);
        // Continue submission even if AI feedback fails
      }
    }

    // Clean up temporary fields before saving
    const finalAnswers = gradedAnswers.map((a: any) => ({
      questionId: a.questionId,
      answer: a.answer,
      feedback: a.feedback
    }));

    const submission = await Submission.create({
      exam: id,
      student: authUser._id,
      answers: finalAnswers,
      score,
    });

    await logActivity({
      userId: authUser._id.toString(),
      action: "Submitted Exam",
      details: `Submitted exam: ${exam.title} with score ${score}`,
    });

    return NextResponse.json({ message: "Exam submitted", score, submission });
  } catch (error) {
    console.error("SUBMIT EXAM ERROR", error);
    return NextResponse.json({ message: "Server Error", error }, { status: 500 });
  }
}

