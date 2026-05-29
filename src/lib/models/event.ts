import mongoose, { Schema, Document } from "mongoose";

export interface IEvent extends Document {
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
  type: "Academic" | "Holiday" | "Exam" | "Meeting";
  audience: "All" | "Teachers" | "Students" | "Parents";
  createdBy: mongoose.Types.ObjectId;
  school?: mongoose.Types.ObjectId;
}

const eventSchema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String, default: "" },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    type: {
      type: String,
      enum: ["Academic", "Holiday", "Exam", "Meeting"],
      default: "Academic",
    },
    audience: {
      type: String,
      enum: ["All", "Teachers", "Students", "Parents"],
      default: "All",
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    school: { type: Schema.Types.ObjectId, ref: "SchoolSettings" },
  },
  { timestamps: true }
);

export const Event = mongoose.models.Event || mongoose.model<IEvent>("Event", eventSchema);
