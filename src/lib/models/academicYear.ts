import mongoose, { Schema, Document } from "mongoose";

export interface ITerm {
  term: string;
  startDate: Date;
  endDate: Date;
}

export interface IAcademicYear extends Document {
  school: mongoose.Types.ObjectId;
  name: string; // "2026-2027"
  fromYear: Date; // Derived/fallback
  toYear: Date; // Derived/fallback
  isCurrent: boolean; // true/false
  term: string; // Legacy fallback
  activeTerm: string; // "Term 1" | "Term 2" | "Term 3"
  terms: ITerm[];
}

const termSchema = new Schema({
  term: { type: String, enum: ["Term 1", "Term 2", "Term 3"], required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
});

const academicYearSchema = new Schema<IAcademicYear>(
  {
    school: { type: Schema.Types.ObjectId, ref: "School", required: true },
    name: { type: String, required: true },
    fromYear: { type: Date, required: true },
    toYear: { type: Date, required: true },
    isCurrent: { type: Boolean, default: false },
    term: { type: String, default: "Term 1" }, // Legacy
    activeTerm: { type: String, enum: ["Term 1", "Term 2", "Term 3"], default: "Term 1" },
    terms: [termSchema],
  },
  { timestamps: true }
);

export default (mongoose.models.AcademicYear || mongoose.model<IAcademicYear>(
  "AcademicYear",
  academicYearSchema
));
