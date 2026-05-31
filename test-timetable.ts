import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { connectDB } from "./src/lib/db";
import Class from "./src/lib/models/class";
import School from "./src/lib/models/school";
import Timetable from "./src/lib/models/timetable";

async function test() {
  await connectDB();
  const school = await School.findOne({ slug: "springfield" }); // Or whatever tenant we can test
  if (!school) return console.log("School not found");

  const classes = await Class.find({ school: school._id });
  console.log("Classes found:", classes.length);
  
  const timetables = await Timetable.find({ school: school._id });
  console.log("Timetables found:", timetables.length);

  for (const c of classes) {
    const hasTimetable = timetables.some(t => t.class.toString() === c._id.toString());
    console.log(`Class ${c.name}: Has Timetable? ${hasTimetable}`);
  }
}
test().then(() => process.exit(0)).catch(console.error);
