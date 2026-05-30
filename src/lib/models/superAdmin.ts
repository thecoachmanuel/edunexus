import mongoose, { Schema, Document } from "mongoose";
import bcrypt from "bcryptjs";

export interface ISuperAdmin extends Document {
  name: string;
  email: string;
  password?: string;
  role: "super_admin" | "support_agent" | "finance_manager";
  isActive: boolean;
  lastLoginAt?: Date;
  matchPassword: (enteredPassword: string) => Promise<boolean>;
}

const superAdminSchema = new Schema<ISuperAdmin>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["super_admin", "support_agent", "finance_manager"],
      default: "support_agent",
    },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
  },
  { timestamps: true }
);

// pre-save middleware to hash password
superAdminSchema.pre<ISuperAdmin>("save", async function () {
  if (!this.isModified("password")) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password as string, salt);
});

// method to match entered password with hashed password
superAdminSchema.methods.matchPassword = async function (enteredPassword: string) {
  return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.models.SuperAdmin || mongoose.model<ISuperAdmin>("SuperAdmin", superAdminSchema);
