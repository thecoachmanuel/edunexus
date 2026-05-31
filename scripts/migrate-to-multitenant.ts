import mongoose from "mongoose";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const MONGODB_URI = process.env.MONGO_URL as string;

if (!MONGODB_URI) {
  throw new Error("MONGO_URL is missing in .env.local");
}

async function migrate() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(MONGODB_URI);
  console.log("Connected.");

  const db = mongoose.connection.db!;

  console.log("Creating seed School...");
  
  // Create School if not exists
  let seedSchool = await db.collection("schools").findOne({ slug: "edunexus" });
  if (!seedSchool) {
    const result = await db.collection("schools").insertOne({
      name: "EduNexus Academy",
      slug: "edunexus",
      email: "admin@edunexus.ng",
      country: "Nigeria",
      isActive: true,
      isVerified: true,
      onboardingCompleted: true,
      isTrialActive: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    seedSchool = { _id: result.insertedId };
    console.log("Created seed school with ID:", seedSchool._id);
  } else {
    console.log("Seed school already exists with ID:", seedSchool._id);
  }

  console.log("Creating Enterprise Plan...");
  let enterprisePlan = await db.collection("plans").findOne({ slug: "enterprise" });
  if (!enterprisePlan) {
    const result = await db.collection("plans").insertOne({
      name: "Enterprise",
      slug: "enterprise",
      monthlyPriceKobo: 7500000,
      features: {
        maxStudents: -1,
        lmsEnabled: true,
        financeEnabled: true,
        aiTimetableEnabled: true,
        advancedAnalytics: true,
        prioritySupport: true,
        dedicatedSupport: true,
      },
      isActive: true,
      isHighlighted: true,
      displayOrder: 3,
      trialAllowed: false,
      trialDays: 14,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    enterprisePlan = { _id: result.insertedId };
    console.log("Created Enterprise plan");
  }

  console.log("Creating Subscription for seed school...");
  let subscription = await db.collection("subscriptions").findOne({ school: seedSchool._id });
  if (!subscription) {
    const result = await db.collection("subscriptions").insertOne({
      school: seedSchool._id,
      plan: enterprisePlan._id,
      status: "active",
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      renewalCount: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    
    // Update school with subscription
    await db.collection("schools").updateOne(
      { _id: seedSchool._id },
      { $set: { subscription: result.insertedId } }
    );
    console.log("Created Subscription");
  }

  console.log("Migrating all existing collections...");
  const collections = [
    "users", "classes", "subjects", "academicyears", "attendances",
    "events", "exams", "expenses", "feestructures", "gradingconfigs",
    "materials", "reportcards", "salarys", "schoolsettings", "studentfees",
    "studentresults", "submissions", "tasks", "timetables", "activitieslogs"
  ];

  for (const col of collections) {
    const collExists = await db.listCollections({ name: col }).hasNext();
    if (!collExists) {
      console.log(`Skipping collection ${col} (does not exist)`);
      continue;
    }

    const res = await db.collection(col).updateMany(
      { school: { $exists: false } },
      { $set: { school: seedSchool._id } }
    );
    console.log(`✅ Migrated ${col}: updated ${res.modifiedCount} documents`);
  }

  console.log("Migration complete.");
  process.exit(0);
}

migrate().catch(err => {
  console.error("Migration failed:", err);
  process.exit(1);
});
