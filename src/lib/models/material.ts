import mongoose, { Schema, Document } from "mongoose";

export interface IMaterial extends Document {
  title: string;
  description?: string;
  type: string; // "Document", "Video", "Link", "Other"
  url: string;
  classId: mongoose.Types.ObjectId;
  subjectId: mongoose.Types.ObjectId;
  uploader: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const materialSchema = new Schema<IMaterial>(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    type: {
      type: String,
      enum: ["Document", "Video", "Link", "Other"],
      default: "Link",
    },
    url: {
      type: String,
      required: [true, "URL or resource link is required"],
    },
    classId: {
      type: Schema.Types.ObjectId,
      ref: "Class",
      required: [true, "Class is required"],
    },
    subjectId: {
      type: Schema.Types.ObjectId,
      ref: "Subject",
      required: [true, "Subject is required"],
    },
    uploader: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Material ||
  mongoose.model<IMaterial>("Material", materialSchema);
