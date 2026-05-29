import mongoose, { Schema, Document } from "mongoose";

export interface ISalary extends Document {
  employee: mongoose.Types.ObjectId;
  academicYear: mongoose.Types.ObjectId;
  month: number; // 1-12
  year: number; // e.g., 2024
  basicSalary: number;
  allowances: number;
  deductions: number;
  netSalary: number;
  status: "pending" | "paid";
  paymentDate?: Date;
  paymentMethod?: "cash" | "bank_transfer" | "card" | "other";
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const salarySchema = new Schema(
  {
    employee: { type: Schema.Types.ObjectId, ref: "User", required: true },
    academicYear: {
      type: Schema.Types.ObjectId,
      ref: "AcademicYear",
      required: true,
    },
    month: { type: Number, required: true, min: 1, max: 12 },
    year: { type: Number, required: true },
    basicSalary: { type: Number, required: true },
    allowances: { type: Number, default: 0 },
    deductions: { type: Number, default: 0 },
    netSalary: { type: Number, required: true },
    status: {
      type: String,
      enum: ["pending", "paid"],
      default: "pending",
    },
    paymentDate: { type: Date },
    paymentMethod: {
      type: String,
      enum: ["cash", "bank_transfer", "card", "other"],
    },
    notes: { type: String },
  },
  { timestamps: true }
);

// Prevent duplicate salary records for the same employee in the same month/year
salarySchema.index({ employee: 1, month: 1, year: 1 }, { unique: true });
salarySchema.index({ status: 1 });

export default (mongoose.models.Salary ||
  mongoose.model<ISalary>("Salary", salarySchema));
