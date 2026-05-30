import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGO_URL;
if (!MONGODB_URI) throw new Error("MONGO_URL is missing in .env.local");

async function seedPlans() {
  console.log("Connecting...");
  await mongoose.connect(MONGODB_URI!);
  const db = mongoose.connection.db!;

  const plans = [
    {
      name: "Starter",
      slug: "starter",
      monthlyPriceKobo: 2500000, // ₦25,000
      features: {
        maxStudents: 200,
        lmsEnabled: false,
        financeEnabled: true,
        aiTimetableEnabled: true,
        advancedAnalytics: false,
        prioritySupport: false,
        dedicatedSupport: false,
      },
      isActive: true,
      isHighlighted: false,
      displayOrder: 1,
      trialAllowed: true,
      trialDays: 14,
    },
    {
      name: "Growth",
      slug: "growth",
      monthlyPriceKobo: 5000000, // ₦50,000
      features: {
        maxStudents: 500,
        lmsEnabled: true,
        financeEnabled: true,
        aiTimetableEnabled: true,
        advancedAnalytics: true,
        prioritySupport: true,
        dedicatedSupport: false,
      },
      isActive: true,
      isHighlighted: true,
      displayOrder: 2,
      trialAllowed: true,
      trialDays: 14,
    },
    {
      name: "Enterprise",
      slug: "enterprise",
      monthlyPriceKobo: 7500000, // ₦75,000
      features: {
        maxStudents: -1, // unlimited
        lmsEnabled: true,
        financeEnabled: true,
        aiTimetableEnabled: true,
        advancedAnalytics: true,
        prioritySupport: true,
        dedicatedSupport: true,
      },
      isActive: true,
      isHighlighted: false,
      displayOrder: 3,
      trialAllowed: false,
      trialDays: 14,
    },
  ];

  for (const plan of plans) {
    const existing = await db.collection("plans").findOne({ slug: plan.slug });
    if (!existing) {
      await db.collection("plans").insertOne({ ...plan, createdAt: new Date(), updatedAt: new Date() });
      console.log(`✅ Created plan: ${plan.name}`);
    } else {
      await db.collection("plans").updateOne({ slug: plan.slug }, { $set: plan });
      console.log(`♻️  Updated plan: ${plan.name}`);
    }
  }

  console.log("Plans seeded successfully.");
  process.exit(0);
}

seedPlans().catch(err => { console.error(err); process.exit(1); });
