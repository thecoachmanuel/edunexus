import mongoose, { Schema, Document } from "mongoose";

export interface IPeriod {
  subject: mongoose.Types.ObjectId;
  teacher: mongoose.Types.ObjectId;
  startTime: string; // e.g., "08:00"
  endTime: string; // e.g., "08:45"
  name?: string; // Optional name for breaks, e.g., "Lunch Break"
}

export interface IDaySchedule {
  day: string; // "Monday", "Tuesday", etc.
  periods: IPeriod[];
}

export interface ITimetable extends Document {
  class: mongoose.Types.ObjectId;
  academicYear: mongoose.Types.ObjectId;
  term?: string; // e.g. "Term 1"
  schedule: IDaySchedule[];
  createdAt: Date;
}

const timetableSchema = new Schema(
  {
    class: { type: Schema.Types.ObjectId, ref: "Class", required: true },
    academicYear: {
      type: Schema.Types.ObjectId,
      ref: "AcademicYear",
      required: true,
    },
    term: { type: String, enum: ["Term 1", "Term 2", "Term 3"] },
    schedule: [
      {
        day: { type: String, required: true },
        periods: [
          {
            subject: { type: Schema.Types.ObjectId, ref: "Subject" },
            teacher: { type: Schema.Types.ObjectId, ref: "User" },
            startTime: String,
            endTime: String,
            name: String,
          },
        ],
      },
    ],
  },
  { timestamps: true }
);

// Prevent multiple timetables for the same class/year/term
timetableSchema.index({ class: 1, academicYear: 1, term: 1 }, { unique: true });

export default (mongoose.models.Timetable || mongoose.model<ITimetable>("Timetable", timetableSchema));
