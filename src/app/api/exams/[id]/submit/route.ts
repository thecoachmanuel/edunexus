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

    const exam = await Exam.findById(id).select("+questions.correctAnswer");
    if (!exam) return NextResponse.json({ message: "Exam not found" }, { status: 404 });

    if (!exam.isActive || new Date() > new Date(exam.dueDate)) {
      return NextResponse.json({ message: "Exam is no longer active" }, { status: 400 });
    }

    const existingSubmission = await Submission.findOne({ exam: id, student: authUser._id });
    if (existingSubmission) {
      return NextResponse.json({ message: "You have already submitted this exam" }, { status: 400 });
    }

    // 1. Prepare data for the AI grader
    const examQuestions = answers.map((ans: any) => {
      const question = exam.questions.find((q: any) => q._id.toString() === ans.questionId);
      return {
        questionId: ans.questionId,
        questionText: question?.questionText,
        options: question?.options,
        expectedAnswer: question?.correctAnswer, // Rubric/guide for the AI
        studentAnswer: ans.answer,
        points: question?.points || 1,
      };
    });

    let score = 0;
    const gradedAnswers = examQuestions.map((q: any) => {
      const expected = q.expectedAnswer || "";
      const student = q.studentAnswer || "";
      // Robust normalized deterministic comparison
      const isCorrect = expected.trim().toLowerCase() === student.trim().toLowerCase();
      if (isCorrect) {
        score += q.points;
      }
      return {
        questionId: q.questionId,
        questionText: q.questionText,
        type: q.options && q.options.length > 0 ? "MCQ" : "SHORT_ANSWER",
        options: q.options,
        expectedAnswer: expected,
        studentAnswer: student,
        isCorrect,
        points: q.points,
        feedback: "",
      };
    });

    const candidatesForAIEval = gradedAnswers.filter((a: any) => !a.isCorrect && a.questionText);

    // 2. Delegate explanation and smart grading to AI
    if (candidatesForAIEval.length > 0 && process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      try {
        const prompt = `
          You are an expert AI teacher grading an exam.
          Here are questions that the student did not answer with a direct string match to the expected answer.
          
          For each question:
          1. Evaluate if their answer is semantically correct and deserves full marks.
             - For Multiple Choice Questions (MCQ), they MUST have matched the correct option, so their "isCorrect" must remain false.
             - For Short Answer Questions, if their answer is semantically equivalent, correct, or highly accurate compared to the expected answer (rubric), mark them "isCorrect": true. Otherwise, false.
          2. If "isCorrect" is false, you MUST provide a brief 1-2 sentence explanation ("feedback") on why their answer was wrong and explicitly state what the right option/answer is. Do not mark anyone wrong without providing the right option and reason.
          3. If "isCorrect" is true, set "feedback" to empty string ("").

          Questions:
          ${JSON.stringify(candidatesForAIEval.map((a: any) => ({
            id: a.questionId,
            questionText: a.questionText,
            type: a.type,
            options: a.options,
            studentAnswer: a.studentAnswer,
            correctAnswer: a.expectedAnswer
          })))}
          
          Output STRICT JSON ONLY. Schema:
          [
            { "id": "questionId", "isCorrect": true, "feedback": "" },
            { "id": "questionId", "isCorrect": false, "feedback": "Your brief explanation here, explaining why they are wrong, and stating the correct option/answer." }
          ]
        `;

        const model = genAI.getGenerativeModel({ 
          model: "gemini-2.5-flash",
          generationConfig: {
            responseMimeType: "application/json"
          }
        });
        const result = await model.generateContent(prompt);
        const textResponse = result.response.text();
        const cleanJSON = textResponse.replace(/```json/g, "").replace(/```/g, "").trim();
        const feedbackData = JSON.parse(cleanJSON);

        feedbackData.forEach((fb: any) => {
          const ans = gradedAnswers.find((a: any) => a.questionId === fb.id);
          if (ans) {
            // If the AI determined it is correct (e.g., semantic short answer match)
            if (fb.isCorrect === true && !ans.isCorrect) {
              ans.isCorrect = true;
              score += ans.points; // Add the points for this question since they are now marked correct!
            }
            ans.feedback = fb.feedback || "";
          }
        });
      } catch (aiError) {
        console.error("AI FEEDBACK/GRADING ERROR", aiError);
        // Fallback: supply a basic explanation if Gemini fails
        gradedAnswers.forEach((ans: any) => {
          if (!ans.isCorrect && !ans.feedback) {
            ans.feedback = `Incorrect. Expected: "${ans.expectedAnswer}".`;
          }
        });
      }
    }

    // Clean up temporary fields before saving
    const finalAnswers = gradedAnswers.map((a: any) => ({
      questionId: a.questionId,
      answer: a.studentAnswer,
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
      details: `Submitted exam: ${exam.title} with AI score ${score}`,
    });

    return NextResponse.json({ message: "Exam submitted", score, submission });
  } catch (error) {
    console.error("SUBMIT EXAM ERROR", error);
    return NextResponse.json({ message: "Server Error", error }, { status: 500 });
  }
}

