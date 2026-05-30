import mongoose, { Schema, Document } from "mongoose";

export interface ISchoolSettings extends Document {
  school: mongoose.Types.ObjectId;
  bankName: string;
  accountName: string;
  accountNumber: string;
  whatsappNumber: string;
  schoolName: string;
  schoolLogo: string;
  schoolMotto: string;
  createdAt: Date;
  updatedAt: Date;
}

const schoolSettingsSchema = new Schema(
  {
    school: { type: Schema.Types.ObjectId, ref: "School", required: true },
    bankName: { type: String, default: "" },
    accountName: { type: String, default: "" },
    accountNumber: { type: String, default: "" },
    whatsappNumber: { type: String, default: "" },
    schoolName: { type: String, default: "EduNexus School" },
    schoolLogo: { type: String, default: "" },
    schoolMotto: { type: String, default: "Excellence · Integrity · Innovation" },
  },
  { timestamps: true }
);

export default (mongoose.models.SchoolSettings ||
  mongoose.model<ISchoolSettings>("SchoolSettings", schoolSettingsSchema));
