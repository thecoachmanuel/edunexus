import mongoose, { Schema, Document } from "mongoose";

export interface ISupportTicket extends Document {
  school: mongoose.Types.ObjectId;
  ticketNumber: string;
  subject: string;
  category: "billing" | "technical" | "onboarding" | "general";
  priority: "low" | "medium" | "high" | "urgent";
  status: "open" | "ai_handling" | "escalated" | "resolved" | "closed";
  messages: {
    sender: "school" | "ai" | "human_agent" | "system";
    senderName: string;
    content: string;
    timestamp: Date;
    agentId?: mongoose.Types.ObjectId;
    isRead: boolean;
  }[];
  assignedTo?: mongoose.Types.ObjectId;
  aiSummary?: string;
  escalatedAt?: Date;
  resolvedAt?: Date;
  closedAt?: Date;
  lastActivityAt: Date;
}

const supportTicketSchema = new Schema<ISupportTicket>(
  {
    school: { type: Schema.Types.ObjectId, ref: "School", required: true },
    ticketNumber: { type: String, required: true, unique: true },
    subject: { type: String, required: true },
    category: {
      type: String,
      enum: ["billing", "technical", "onboarding", "general"],
      required: true,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    status: {
      type: String,
      enum: ["open", "ai_handling", "escalated", "resolved", "closed"],
      default: "ai_handling",
    },
    messages: [
      {
        sender: {
          type: String,
          enum: ["school", "ai", "human_agent", "system"],
          required: true,
        },
        senderName: { type: String, required: true },
        content: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        agentId: { type: Schema.Types.ObjectId, ref: "SuperAdmin" },
        isRead: { type: Boolean, default: false },
      },
    ],
    assignedTo: { type: Schema.Types.ObjectId, ref: "SuperAdmin" },
    aiSummary: { type: String },
    escalatedAt: { type: Date },
    resolvedAt: { type: Date },
    closedAt: { type: Date },
    lastActivityAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.models.SupportTicket || mongoose.model<ISupportTicket>("SupportTicket", supportTicketSchema);
