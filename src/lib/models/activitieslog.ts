import mongoose, { Schema, Document } from "mongoose";

export interface IActivityLog extends Document {
  user: string; // Who did it?
  action: string; // "Created Exam", "Registered Student"
  details?: string; // optional additional details
  createdAt: Date;
}

// types don't need to be defined in the schema more so here where we define user as string instead of objectId
const activitiesLogSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, required: true, ref: "User" },
    action: { type: String, required: true },
    details: { type: String },
  },
  {
    timestamps: true,
  }
);

// TTL index to automatically delete logs older than 7 days (604800 seconds)
activitiesLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 604800 });
activitiesLogSchema.index({ action: 1 });

export default (mongoose.models.ActivitiesLog || mongoose.model<IActivityLog>(
  "ActivitiesLog",
  activitiesLogSchema
));
