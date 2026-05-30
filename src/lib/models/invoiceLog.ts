import mongoose, { Schema, Document } from "mongoose";

export interface IInvoiceLog extends Document {
  school: mongoose.Types.ObjectId;
  subscription?: mongoose.Types.ObjectId;
  amount: number;
  currency: string;
  status: "success" | "failed" | "refunded";
  paystackReference: string;
  paystackEvent: string;
  rawPayload: any;
  paidAt: Date;
}

const invoiceLogSchema = new Schema<IInvoiceLog>(
  {
    school: { type: Schema.Types.ObjectId, ref: "School" },
    subscription: { type: Schema.Types.ObjectId, ref: "Subscription" },
    amount: { type: Number, required: true }, // in kobo
    currency: { type: String, default: "NGN" },
    status: {
      type: String,
      enum: ["success", "failed", "refunded"],
      required: true,
    },
    paystackReference: { type: String, required: true },
    paystackEvent: { type: String, required: true },
    rawPayload: { type: Schema.Types.Mixed },
    paidAt: { type: Date, required: true },
  },
  { timestamps: true }
);

export default mongoose.models.InvoiceLog || mongoose.model<IInvoiceLog>("InvoiceLog", invoiceLogSchema);
