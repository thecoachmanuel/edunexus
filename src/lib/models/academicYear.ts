import mongoose, { Schema, Document } from "mongoose";

export interface IAcademicYear extends Document {
  name: string; // "2024-2025"
  fromYear: Date; // "2024-09-01"
  toYear: Date; // "2025-06-30"
  isCurrent: boolean; // true/false
  term: string; // "Term 1"
}

const academicYearSchema = new Schema(
  {
    name: { type: String, required: true },
    fromYear: { type: Date, required: true },
    toYear: { type: Date, required: true },
    isCurrent: { type: Boolean, default: false },
    term: { type: String, default: "Term 1" },
  },
  { timestamps: true }
);

export default (mongoose.models.AcademicYear || mongoose.model<IAcademicYear>(
  "AcademicYear",
  academicYearSchema
));
