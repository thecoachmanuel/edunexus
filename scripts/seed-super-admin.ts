import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const MONGODB_URI = process.env.MONGO_URL as string;
if (!MONGODB_URI) throw new Error("MONGO_URL missing");

async function seedSuperAdmin() {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db!;

  const existing = await db.collection("superadmins").findOne({ email: "superadmin@edunexus.ng" });
  if (existing) {
    console.log("Super admin already exists.");
    process.exit(0);
  }

  const hashed = await bcrypt.hash("EduNexusAdmin@2024", 10);
  await db.collection("superadmins").insertOne({
    name: "EduNexus Super Admin",
    email: "superadmin@edunexus.ng",
    password: hashed,
    role: "super_admin",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  console.log("✅ Super admin created:");
  console.log("   Email: superadmin@edunexus.ng");
  console.log("   Password: EduNexusAdmin@2024");
  console.log("   ⚠️  Change this password immediately after first login!");
  process.exit(0);
}

seedSuperAdmin().catch(err => { console.error(err); process.exit(1); });
