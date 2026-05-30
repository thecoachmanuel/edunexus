import mongoose, { Schema, Document } from "mongoose";

export interface ITransaction {
  amount: number;
  date: Date;
  method: "cash" | "bank_transfer" | "card" | "other";
  receiptNumber?: string;
  notes?: string;
}

export interface IStudentFee extends Document {
  school: mongoose.Types.ObjectId;
  student: mongoose.Types.ObjectId;
  feeStructure: mongoose.Types.ObjectId;
  class: mongoose.Types.ObjectId;
  academicYear: mongoose.Types.ObjectId;
  totalAmount: number;
  amountPaid: number;
  balance: number;
  status: "paid" | "partial" | "unpaid";
  transactions: ITransaction[];
  createdAt: Date;
  updatedAt: Date;
}

const transactionSchema = new Schema({
    school: { type: Schema.Types.ObjectId, ref: "School", required: true },
  amount: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  method: {
    type: String,
    enum: ["cash", "bank_transfer", "card", "other"],
    default: "cash",
  },
  receiptNumber: { type: String },
  notes: { type: String },
});

const studentFeeSchema = new Schema(
  {
    student: { type: Schema.Types.ObjectId, ref: "User", required: true },
    feeStructure: {
      type: Schema.Types.ObjectId,
      ref: "FeeStructure",
      required: true,
    },
    class: { type: Schema.Types.ObjectId, ref: "Class", required: true },
    academicYear: {
      type: Schema.Types.ObjectId,
      ref: "AcademicYear",
      required: true,
    },
    totalAmount: { type: Number, required: true },
    amountPaid: { type: Number, default: 0 },
    balance: { type: Number, required: true },
    status: {
      type: String,
      enum: ["paid", "partial", "unpaid"],
      default: "unpaid",
    },
    transactions: [transactionSchema],
  },
  { timestamps: true }
);

studentFeeSchema.index({ student: 1 });
studentFeeSchema.index({ status: 1 });
studentFeeSchema.index({ class: 1, academicYear: 1 });

export default (mongoose.models.StudentFee ||
  mongoose.model<IStudentFee>("StudentFee", studentFeeSchema));
