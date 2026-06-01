import mongoose, { Schema, Document } from "mongoose";

export interface ISchool extends Document {
  name: string;
  slug: string;
  email: string;
  phone?: string;
  address?: string;
  state?: string;
  country: string;
  logo?: string;
  isActive: boolean;
  isVerified: boolean;
  verificationToken?: string;
  verificationExpiry?: Date;
  onboardingCompleted: boolean;
  onboardedAt?: Date;
  trialEndsAt?: Date;
  isTrialActive: boolean;
  subscription?: mongoose.Types.ObjectId;
  aiTimetableUsage?: {
    date: Date;
    count: number;
  };
}

const schoolSchema = new Schema<ISchool>(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String },
    address: { type: String },
    state: { type: String },
    country: { type: String, default: "Nigeria" },
    logo: { type: String },
    isActive: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: false },
    verificationToken: { type: String },
    verificationExpiry: { type: Date },
    onboardingCompleted: { type: Boolean, default: false },
    onboardedAt: { type: Date },
    trialEndsAt: { type: Date },
    isTrialActive: { type: Boolean, default: false },
    subscription: { type: Schema.Types.ObjectId, ref: "Subscription" },
    aiTimetableUsage: {
      date: { type: Date },
      count: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

export default mongoose.models.School || mongoose.model<ISchool>("School", schoolSchema);
