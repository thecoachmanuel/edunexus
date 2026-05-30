import mongoose, { Schema, Document } from "mongoose";

export interface IStudentResult extends Document {
  school: mongoose.Types.ObjectId;
  student: mongoose.Types.ObjectId;
  subject: mongoose.Types.ObjectId;
  class: mongoose.Types.ObjectId;
  academicYear: mongoose.Types.ObjectId;
  term: string;                   // e.g. "Term 1"

  // Raw component scores
  quizRawScore: number;           // Auto-calculated from submissions, adjustable
  quizMaxScore: number;           // Snapshot from GradingConfig
  caScore: number;                // Manually entered
  caMaxScore: number;             // Snapshot from GradingConfig
  examScore: number;              // Manually entered
  examMaxScore: number;           // Snapshot from GradingConfig

  // Computed aggregate (out of 100)
  aggregateScore: number;
  grade: string;
  remark: string;

  // Audit trail
  caEnteredBy?: mongoose.Types.ObjectId;
  examEnteredBy?: mongoose.Types.ObjectId;
  quizAdjustedBy?: mongoose.Types.ObjectId;
  lastModified: Date;
}

const studentResultSchema = new Schema<IStudentResult>(
  {
    school: { type: Schema.Types.ObjectId, ref: "School", required: true },
    student: { type: Schema.Types.ObjectId, ref: "User", required: true },
    subject: { type: Schema.Types.ObjectId, ref: "Subject", required: true },
    class: { type: Schema.Types.ObjectId, ref: "Class", required: true },
    academicYear: { type: Schema.Types.ObjectId, ref: "AcademicYear", required: true },
    term: { type: String, required: true },

    quizRawScore: { type: Number, default: 0 },
    quizMaxScore: { type: Number, default: 100 },
    caScore: { type: Number, default: 0 },
    caMaxScore: { type: Number, default: 20 },
    examScore: { type: Number, default: 0 },
    examMaxScore: { type: Number, default: 70 },

    aggregateScore: { type: Number, default: 0 },
    grade: { type: String, default: "F" },
    remark: { type: String, default: "Fail" },

    caEnteredBy: { type: Schema.Types.ObjectId, ref: "User" },
    examEnteredBy: { type: Schema.Types.ObjectId, ref: "User" },
    quizAdjustedBy: { type: Schema.Types.ObjectId, ref: "User" },
    lastModified: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// One result per student per subject per term per year
studentResultSchema.index(
  { student: 1, subject: 1, academicYear: 1, term: 1 },
  { unique: true }
);
// Efficient broadsheet lookups
studentResultSchema.index({ class: 1, academicYear: 1, term: 1 });
studentResultSchema.index({ student: 1, academicYear: 1, term: 1 });

export default (
  mongoose.models.StudentResult ||
  mongoose.model<IStudentResult>("StudentResult", studentResultSchema)
);
