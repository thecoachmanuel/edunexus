import mongoose from "mongoose";
import { connectDB } from "./src/lib/db";
import Submission from "./src/lib/models/submission";
import Exam from "./src/lib/models/exam";
import fs from "fs";

async function fixScores() {
  const logFile = "repair_log.txt";
  fs.writeFileSync(logFile, "Scoring repair engine started.\n");

  try {
    fs.appendFileSync(logFile, "Connecting to MongoDB...\n");
    await connectDB();
    fs.appendFileSync(logFile, "MongoDB Connected successfully!\n");
    
    // Explicitly reference Exam to prevent ESModule tree-shaking
    console.log(`Initializing scoring repair engine with model: ${Exam.modelName}`);
    fs.appendFileSync(logFile, `Exam model name: ${Exam.modelName}\n`);

    fs.appendFileSync(logFile, "Fetching submissions and populating exams...\n");
    const submissions = await Submission.find({}).populate({
      path: "exam",
      select: "+questions.correctAnswer"
    });
    fs.appendFileSync(logFile, `Found ${submissions.length} submissions in database.\n`);
    
    let fixedCount = 0;

    for (const sub of submissions) {
      if (!sub.exam) {
        fs.appendFileSync(logFile, `Skipping submission ${sub._id} because exam populate returned null.\n`);
        continue;
      }

      let correctScore = 0;
      const exam: any = sub.exam;
      
      // Check all answers against the exam rubric
      sub.answers.forEach((ans: any) => {
        const q = exam.questions.find((q: any) => q._id.toString() === ans.questionId);
        if (q) {
          const expected = q.correctAnswer || "";
          const student = ans.answer || "";
          const isCorrect = expected.trim().toLowerCase() === student.trim().toLowerCase();
          if (isCorrect) {
            correctScore += q.points || 1;
          }
        }
      });

      if (sub.score !== correctScore) {
        const logMsg = `Fixing submission ${sub._id}. Old Score: ${sub.score}, New Score: ${correctScore}\n`;
        fs.appendFileSync(logFile, logMsg);
        console.log(logMsg.trim());
        sub.score = correctScore;
        await sub.save();
        fixedCount++;
      } else {
        fs.appendFileSync(logFile, `Submission ${sub._id} score is correct: ${sub.score}\n`);
      }
    }

    const finalMsg = `Finished fixing scores. ${fixedCount} submissions updated.\n`;
    fs.appendFileSync(logFile, finalMsg);
    console.log(finalMsg.trim());
    process.exit(0);
  } catch (error: any) {
    const errorMsg = `ERROR ENCOUNTERED: ${error?.message || error}\n${error?.stack || ""}\n`;
    fs.appendFileSync(logFile, errorMsg);
    console.error(errorMsg);
    process.exit(1);
  }
}

fixScores().catch((err) => {
  fs.appendFileSync("repair_log.txt", `GLOBAL UNCAUGHT ERROR: ${err}\n`);
  process.exit(1);
});
