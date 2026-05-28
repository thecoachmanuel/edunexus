import mongoose, { Schema, Document } from "mongoose";

export interface IGrade {
  subject: mongoose.Types.ObjectId;
  score: number;
  grade: string;
}

export interface IReportCard extends Document {
  student: mongoose.Types.ObjectId;
  class: mongoose.Types.ObjectId;
  academicYear: mongoose.Types.ObjectId;
  term: string; // e.g., "Term 1", "Term 2"
  grades: IGrade[];
  averageScore: number;
  overallGrade: string;
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
        score: { type: Number, required: true },
        grade: { type: String, required: true },
      },
    ],
    averageScore: { type: Number, required: true },
    overallGrade: { type: String, required: true },
  },
  { timestamps: true }
);

// Ensure a student only has one report card per term per year
reportCardSchema.index({ student: 1, academicYear: 1, term: 1 }, { unique: true });

export default mongoose.models.ReportCard ||
  mongoose.model<IReportCard>("ReportCard", reportCardSchema);
