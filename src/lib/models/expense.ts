import mongoose, { Schema, Document } from "mongoose";

export interface IExpense extends Document {
  title: string;
  amount: number;
  category:
    | "salary"
    | "utilities"
    | "maintenance"
    | "supplies"
    | "equipment"
    | "other";
  description?: string;
  date: Date;
  paymentMethod: "cash" | "bank_transfer" | "card" | "other";
  receipt?: string;
  recordedBy: mongoose.Types.ObjectId;
  academicYear: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const expenseSchema = new Schema(
  {
    title: { type: String, required: true },
    amount: { type: Number, required: true },
    category: {
      type: String,
      enum: [
        "salary",
        "utilities",
        "maintenance",
        "supplies",
        "equipment",
        "other",
      ],
      default: "other",
    },
    description: { type: String },
    date: { type: Date, required: true },
    paymentMethod: {
      type: String,
      enum: ["cash", "bank_transfer", "card", "other"],
      default: "cash",
    },
    receipt: { type: String }, // URL or reference to uploaded receipt
    recordedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    academicYear: {
      type: Schema.Types.ObjectId,
      ref: "AcademicYear",
      required: true,
    },
  },
  { timestamps: true }
);

expenseSchema.index({ category: 1 });
expenseSchema.index({ date: 1 });
expenseSchema.index({ academicYear: 1 });

export default (mongoose.models.Expense ||
  mongoose.model<IExpense>("Expense", expenseSchema));
