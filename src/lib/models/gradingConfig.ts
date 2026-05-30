import mongoose, { Schema, Document } from "mongoose";

export interface IGradeThreshold {
  grade: string;   // e.g. "A", "B", "C", "D", "F"
  minScore: number; // Minimum aggregate score to earn this grade
  remark: string;  // e.g. "Excellent", "Good", "Pass", "Fail"
}

export interface IGradingConfig extends Document {
  school: mongoose.Types.ObjectId;
  academicYear: mongoose.Types.ObjectId;
  term: string;                 // e.g. "Term 1"
  // Score weights (must total 100)
  quizWeight: number;           // e.g. 10
  caWeight: number;             // e.g. 20
  examWeight: number;           // e.g. 70
  // Max raw scores for each component
  quizMaxScore: number;         // e.g. 100 (total quiz points collectable)
  caMaxScore: number;           // e.g. 20  (max raw CA marks)
  examMaxScore: number;         // e.g. 70  (max raw exam marks)
  // Grade thresholds
  gradeThresholds: IGradeThreshold[];
  // Report card preferences
  showPositionOnReportCard: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const gradeThresholdSchema = new Schema<IGradeThreshold>(
  {
    grade: { type: String, required: true },
    minScore: { type: Number, required: true },
    remark: { type: String, default: "" },
  },
  { _id: false }
);

const gradingConfigSchema = new Schema<IGradingConfig>(
  {
    school: { type: Schema.Types.ObjectId, ref: "School", required: true },
    academicYear: { type: Schema.Types.ObjectId, ref: "AcademicYear", required: true },
    term: { type: String, required: true },
    quizWeight: { type: Number, default: 10 },
    caWeight: { type: Number, default: 20 },
    examWeight: { type: Number, default: 70 },
    quizMaxScore: { type: Number, default: 100 },
    caMaxScore: { type: Number, default: 20 },
    examMaxScore: { type: Number, default: 70 },
    gradeThresholds: {
      type: [gradeThresholdSchema],
      default: [
        { grade: "A", minScore: 75, remark: "Distinction" },
        { grade: "B", minScore: 60, remark: "Credit" },
        { grade: "C", minScore: 50, remark: "Merit" },
        { grade: "D", minScore: 40, remark: "Pass" },
        { grade: "F", minScore: 0,  remark: "Fail" },
      ],
    },
    showPositionOnReportCard: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// One config per school + year + term
gradingConfigSchema.index({ school: 1, academicYear: 1, term: 1 }, { unique: true });

export default (
  mongoose.models.GradingConfig ||
  mongoose.model<IGradingConfig>("GradingConfig", gradingConfigSchema)
);
