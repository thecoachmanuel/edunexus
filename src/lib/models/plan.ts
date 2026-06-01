import mongoose, { Schema, Document } from "mongoose";

export interface IPlan extends Document {
  name: string;
  slug: string;
  monthlyPriceKobo: number;
  annualPriceKobo?: number;
  paystackPlanCode?: string;
  features: {
    maxStudents: number;
    lmsEnabled: boolean;
    financeEnabled: boolean;
    aiTimetableEnabled: boolean;
    aiTimetableDailyLimit: number;
    advancedAnalytics: boolean;
    prioritySupport: boolean;
    dedicatedSupport: boolean;
  };
  isActive: boolean;
  isHighlighted: boolean;
  displayOrder: number;
  trialAllowed: boolean;
  trialDays: number;
}

const planSchema = new Schema<IPlan>(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    monthlyPriceKobo: { type: Number, required: true },
    annualPriceKobo: { type: Number },
    paystackPlanCode: { type: String },
    features: {
      maxStudents: { type: Number, default: 300 }, // -1 for unlimited
      lmsEnabled: { type: Boolean, default: false },
      financeEnabled: { type: Boolean, default: false },
      aiTimetableEnabled: { type: Boolean, default: true },
      aiTimetableDailyLimit: { type: Number, default: 5 },
      advancedAnalytics: { type: Boolean, default: false },
      prioritySupport: { type: Boolean, default: false },
      dedicatedSupport: { type: Boolean, default: false },
    },
    isActive: { type: Boolean, default: true },
    isHighlighted: { type: Boolean, default: false },
    displayOrder: { type: Number, default: 0 },
    trialAllowed: { type: Boolean, default: true },
    trialDays: { type: Number, default: 14 },
  },
  { timestamps: true }
);

export default mongoose.models.Plan || mongoose.model<IPlan>("Plan", planSchema);
