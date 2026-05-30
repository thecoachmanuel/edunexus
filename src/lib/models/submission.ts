import mongoose, { Schema, Document } from "mongoose";

export interface ISubmission extends Document {
  school: mongoose.Types.ObjectId;
  exam: mongoose.Types.ObjectId;
  student: mongoose.Types.ObjectId;
  answers: { questionId: string; answer: string; feedback?: string }[];
  score: number;
  submittedAt: Date;
}

const submissionSchema = new Schema({
    school: { type: Schema.Types.ObjectId, ref: "School", required: true },
  exam: { type: Schema.Types.ObjectId, ref: "Exam", required: true },
  student: { type: Schema.Types.ObjectId, ref: "User", required: true },
  answers: [
    {
      questionId: String,
      answer: String,
      feedback: String,
    },
  ],
  score: { type: Number, default: 0 },
  submittedAt: { type: Date, default: Date.now },
});

// Prevent duplicate submissions
submissionSchema.index({ exam: 1, student: 1 }, { unique: true });
// Optimize searching by student
submissionSchema.index({ student: 1 });

export default (mongoose.models.Submission || mongoose.model<ISubmission>("Submission", submissionSchema));
