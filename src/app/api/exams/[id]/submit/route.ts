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

    let gradedAnswers: any[] = [];
    let score = 0;

    // 2. Delegate grading to AI
    if (examQuestions.length > 0 && process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      try {
        const prompt = `
          You are an expert AI teacher marking a student's exam.
          You are provided with a list of questions, the student's answers, and the expected correct answers (rubrics).
          
          TASK:
          1. Evaluate each student answer carefully using your best knowledge of the subject matter.
          2. Determine if the student's answer is correct or incorrect.
          3. If the answer is INCORRECT, you MUST provide a brief (1-2 sentence) explanation of why it is wrong AND explicitly state what the right option is.
          4. If the answer is CORRECT, you may leave the feedback empty, or provide brief praise/confirmation.

          QUESTIONS TO GRADE:
          ${JSON.stringify(examQuestions, null, 2)}
          
          Output STRICT JSON ONLY. Ensure the output is a valid JSON array of objects.
          Schema:
          [
            { 
              "id": "questionId", 
              "isCorrect": boolean, 
              "feedback": "Your explanation here (mandatory if isCorrect is false)" 
            }
          ]
        `;

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(prompt);
        const textResponse = result.response.text();
        const cleanJSON = textResponse.replace(/```json/g, "").replace(/```/g, "").trim();
        const aiGrading = JSON.parse(cleanJSON);

        // 3. Map AI results back to our final structure
        gradedAnswers = examQuestions.map((q: any) => {
          const aiGrade = aiGrading.find((g: any) => g.id === q.questionId);
          
          // Fallback to strict equality if AI misses a question
          let isCorrect = q.expectedAnswer === q.studentAnswer;
          let feedback = "";
          
          if (aiGrade) {
            isCorrect = Boolean(aiGrade.isCorrect);
            feedback = aiGrade.feedback || "";
          }

          if (isCorrect) score += q.points;

          return {
            questionId: q.questionId,
            answer: q.studentAnswer,
            feedback,
            isCorrect,
          };
        });
      } catch (aiError) {
        console.error("AI GRADING ERROR", aiError);
        // Fallback to basic strict grading if AI fails entirely
        score = 0;
        gradedAnswers = examQuestions.map((q: any) => {
          const isCorrect = q.expectedAnswer === q.studentAnswer;
          if (isCorrect) score += q.points;
          return {
            questionId: q.questionId,
            answer: q.studentAnswer,
            feedback: "AI grading unavailable. Fallback to exact match grading.",
            isCorrect,
          };
        });
      }
    } else {
       // Fallback if no API key
       score = 0;
       gradedAnswers = examQuestions.map((q: any) => {
         const isCorrect = q.expectedAnswer === q.studentAnswer;
         if (isCorrect) score += q.points;
         return {
           questionId: q.questionId,
           answer: q.studentAnswer,
           feedback: "",
           isCorrect,
         };
       });
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
      details: `Submitted exam: ${exam.title} with AI score ${score}`,
    });

    return NextResponse.json({ message: "Exam submitted", score, submission });
  } catch (error) {
    console.error("SUBMIT EXAM ERROR", error);
    return NextResponse.json({ message: "Server Error", error }, { status: 500 });
  }
}

