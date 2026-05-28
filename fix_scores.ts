import mongoose from "mongoose";
import { connectDB } from "./src/lib/db";
import Submission from "./src/lib/models/submission";
import Exam from "./src/lib/models/exam";

async function fixScores() {
  await connectDB();
  
  // Explicitly reference Exam to prevent ESModule tree-shaking
  console.log(`Initializing scoring repair engine with model: ${Exam.modelName}`);

  const submissions = await Submission.find({}).populate({
    path: "exam",
    select: "+questions.correctAnswer"
  });
  let fixedCount = 0;

  for (const sub of submissions) {
    if (!sub.exam) continue;

    let correctScore = 0;
    const exam: any = sub.exam;
    
    // Check all answers against the exam rubric
    sub.answers.forEach((ans: any) => {
      const q = exam.questions.find((q: any) => q._id.toString() === ans.questionId);
      if (q) {
        const expected = q.correctAnswer || "";
        const student = ans.answer || "";
        if (expected.trim().toLowerCase() === student.trim().toLowerCase()) {
          correctScore += q.points || 1;
        }
      }
    });

    if (sub.score !== correctScore) {
      console.log(`Fixing submission ${sub._id}. Old Score: ${sub.score}, New Score: ${correctScore}`);
      sub.score = correctScore;
      await sub.save();
      fixedCount++;
    }
  }

  console.log(`Finished fixing scores. ${fixedCount} submissions updated.`);
  process.exit(0);
}

fixScores().catch(console.error);
