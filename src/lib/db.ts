import mongoose from "mongoose";

// Pre-register all models to prevent MissingSchemaError in Next.js serverless functions during populate()
import "@/lib/models/academicYear";
import "@/lib/models/activitieslog";
import "@/lib/models/attendance";
import "@/lib/models/class";
import "@/lib/models/exam";
import "@/lib/models/expense";
import "@/lib/models/feeStructure";
import "@/lib/models/gradingConfig";
import "@/lib/models/material";
import "@/lib/models/reportCard";
import "@/lib/models/salary";
import "@/lib/models/schoolSettings";
import "@/lib/models/studentFee";
import "@/lib/models/studentResult";
import "@/lib/models/subject";
import "@/lib/models/submission";
import "@/lib/models/task";
import "@/lib/models/timetable";
import "@/lib/models/user";
import "@/lib/models/school";
import "@/lib/models/plan";
import "@/lib/models/subscription";
import "@/lib/models/invoiceLog";
import "@/lib/models/supportTicket";
import "@/lib/models/superAdmin";

const MONGODB_URI = process.env.MONGO_URL as string;

if (!MONGODB_URI) {
  throw new Error(
    "Please define the MONGO_URL environment variable inside .env.local"
  );
}

let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

export const connectDB = async () => {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: true,
      maxPoolSize: 10,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      console.log(`✅ MongoDB Connected: ${mongoose.connection.host}`);
      return mongoose;
    });
  }
  
  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
};
