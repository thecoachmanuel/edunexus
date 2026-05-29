import mongoose, { Schema, Document } from "mongoose";

export interface ISchoolSettings extends Document {
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
