import mongoose, { Schema, Document } from "mongoose";

export interface IAttendanceRecord {
  student: mongoose.Types.ObjectId;
  status: "Present" | "Absent" | "Late" | "Excused";
  remarks?: string;
}

export interface IAttendance extends Document {
  date: Date; // Stored as midnight UTC for the specific day
  class: mongoose.Types.ObjectId;
  academicYear: mongoose.Types.ObjectId;
  recordedBy: mongoose.Types.ObjectId;
  records: IAttendanceRecord[];
  createdAt: Date;
  updatedAt: Date;
}

const attendanceSchema = new Schema<IAttendance>(
  {
    date: { type: Date, required: true },
    class: { type: Schema.Types.ObjectId, ref: "Class", required: true },
    academicYear: { type: Schema.Types.ObjectId, ref: "AcademicYear", required: true },
    recordedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    records: [
      {
        student: { type: Schema.Types.ObjectId, ref: "User", required: true },
        status: { 
          type: String, 
          enum: ["Present", "Absent", "Late", "Excused"], 
          required: true 
        },
        remarks: { type: String, default: "" },
      },
    ],
  },
  { timestamps: true }
);

// Ensure only one attendance record per class per day
attendanceSchema.index({ date: 1, class: 1 }, { unique: true });

export default mongoose.models.Attendance ||
  mongoose.model<IAttendance>("Attendance", attendanceSchema);
