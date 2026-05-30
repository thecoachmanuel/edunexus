import mongoose, { Schema, Document } from "mongoose";

export interface ISubscription extends Document {
  school: mongoose.Types.ObjectId;
  plan: mongoose.Types.ObjectId;
  status: "trialing" | "active" | "past_due" | "cancelled" | "expired";
  paystackSubscriptionCode?: string;
  paystackCustomerCode?: string;
  paystackAuthorizationCode?: string;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  nextPaymentDate?: Date;
  cancelledAt?: Date;
  renewalCount: number;
}

const subscriptionSchema = new Schema<ISubscription>(
  {
    school: { type: Schema.Types.ObjectId, ref: "School", required: true },
    plan: { type: Schema.Types.ObjectId, ref: "Plan", required: true },
    status: {
      type: String,
      enum: ["trialing", "active", "past_due", "cancelled", "expired"],
      default: "trialing",
    },
    paystackSubscriptionCode: { type: String },
    paystackCustomerCode: { type: String },
    paystackAuthorizationCode: { type: String },
    currentPeriodStart: { type: Date },
    currentPeriodEnd: { type: Date },
    nextPaymentDate: { type: Date },
    cancelledAt: { type: Date },
    renewalCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.models.Subscription || mongoose.model<ISubscription>("Subscription", subscriptionSchema);
