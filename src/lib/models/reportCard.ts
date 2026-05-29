import mongoose, { Schema, Document } from "mongoose";

export interface IGrade {
  subject: mongoose.Types.ObjectId;
  // Component scores
  quizScore: number;     // Normalised quiz score (out of quizWeight)
  caScore: number;       // Normalised CA score (out of caWeight)
  examScore: number;     // Normalised exam score (out of examWeight)
  aggregateScore: number; // Total out of 100
  grade: string;
  remark: string;
}

export interface IReportCard extends Document {
  student: mongoose.Types.ObjectId;
  class: mongoose.Types.ObjectId;
  academicYear: mongoose.Types.ObjectId;
  term: string;
  grades: IGrade[];
  totalScore: number;      // Sum of all aggregateScores
  averageScore: number;    // Average across all subjects
  overallGrade: string;
  position: number;        // Class position e.g. 1, 2, 3
  totalStudents: number;   // Total students ranked for this term
  showPosition: boolean;   // Snapshot from GradingConfig at generation time
  createdAt: Date;
  updatedAt: Date;
}

const reportCardSchema = new Schema<IReportCard>(
  {
    student: { type: Schema.Types.ObjectId, ref: "User", required: true },
    class: { type: Schema.Types.ObjectId, ref: "Class", required: true },
    academicYear: { type: Schema.Types.ObjectId, ref: "AcademicYear", required: true },
    term: { type: String, required: true },
    grades: [
      {
        subject: { type: Schema.Types.ObjectId, ref: "Subject", required: true },
        quizScore: { type: Number, default: 0 },
        caScore: { type: Number, default: 0 },
        examScore: { type: Number, default: 0 },
        aggregateScore: { type: Number, default: 0 },
        grade: { type: String, default: "F" },
        remark: { type: String, default: "Fail" },
      },
    ],
    totalScore: { type: Number, default: 0 },
    averageScore: { type: Number, default: 0 },
    overallGrade: { type: String, default: "F" },
    position: { type: Number, default: 0 },
    totalStudents: { type: Number, default: 0 },
    showPosition: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Ensure a student only has one report card per term per year
reportCardSchema.index({ student: 1, academicYear: 1, term: 1 }, { unique: true });
// Optimize searching by class
reportCardSchema.index({ class: 1 });

export default mongoose.models.ReportCard ||
  mongoose.model<IReportCard>("ReportCard", reportCardSchema);

