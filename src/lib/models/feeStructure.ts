import mongoose, { Schema, Document } from "mongoose";

export interface IFeeStructure extends Document {
  school: mongoose.Types.ObjectId;
  name: string;
  amount: number;
  class: mongoose.Types.ObjectId;
  academicYear: mongoose.Types.ObjectId;
  dueDate: Date;
  description?: string;
  category: "tuition" | "exam" | "library" | "sport" | "other";
  createdAt: Date;
  updatedAt: Date;
}

const feeStructureSchema = new Schema(
  {
    school: { type: Schema.Types.ObjectId, ref: "School", required: true },
    name: { type: String, required: true },
    amount: { type: Number, required: true },
    class: { type: Schema.Types.ObjectId, ref: "Class", required: true },
    academicYear: {
      type: Schema.Types.ObjectId,
      ref: "AcademicYear",
      required: true,
    },
    dueDate: { type: Date, required: true },
    description: { type: String },
    category: {
      type: String,
      enum: ["tuition", "exam", "library", "sport", "other"],
      default: "tuition",
    },
  },
  { timestamps: true }
);

export default (mongoose.models.FeeStructure ||
  mongoose.model<IFeeStructure>("FeeStructure", feeStructureSchema));
