import mongoose, { Schema, Document } from "mongoose";

export interface ISaaSTransaction extends Document {
  school: mongoose.Types.ObjectId;
  subscription?: mongoose.Types.ObjectId;
  amountKobo: number;
  currency: string;
  reference: string;
  status: "success" | "failed" | "pending" | "abandoned";
  type: "new_subscription" | "renewal" | "manual_payment";
  description: string;
  paystackCustomerCode?: string;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const saasTransactionSchema = new Schema<ISaaSTransaction>(
  {
    school: { type: Schema.Types.ObjectId, ref: "School", required: true },
    subscription: { type: Schema.Types.ObjectId, ref: "Subscription" },
    amountKobo: { type: Number, required: true },
    currency: { type: String, default: "NGN" },
    reference: { type: String, required: true, unique: true },
    status: {
      type: String,
      enum: ["success", "failed", "pending", "abandoned"],
      default: "pending",
    },
    type: {
      type: String,
      enum: ["new_subscription", "renewal", "manual_payment"],
      required: true,
    },
    description: { type: String, required: true },
    paystackCustomerCode: { type: String },
    paidAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.models.SaaSTransaction || mongoose.model<ISaaSTransaction>("SaaSTransaction", saasTransactionSchema);
