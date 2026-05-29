require("dotenv").config({ path: ".env.local" });
const mongoose = require("mongoose");
const User = require("./src/lib/models/user").default;
const Attendance = require("./src/lib/models/attendance").default;
const Exam = require("./src/lib/models/exam").default;
const StudentFee = require("./src/lib/models/studentFee").default;
const ReportCard = require("./src/lib/models/reportCard").default;

async function test() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to DB");
  
  // Find a parent
  const parent = await User.findOne({ role: "parent" }).populate("children");
  if (!parent) {
    console.log("No parent found");
    process.exit(0);
  }
  console.log("Found parent:", parent.name, "with", parent.children.length, "children");

  const childrenIds = (parent.children || []).map((c) => c._id);
  const children = await User.find({ _id: { $in: childrenIds } })
    .select("name email studentClass")
    .populate("studentClass", "name")
    .lean();

  console.log("Children populated:", children.length);

  try {
    const childrenData = await Promise.all(
      children.map(async (child) => {
        // 1. Attendance summary
        const attendances = await Attendance.find({ "records.student": child._id }).lean();
        // 2. Upcoming quizzes
        const upcomingQuizzes = await Exam.find({
          class: child.studentClass?._id,
          isActive: true,
          dueDate: { $gte: new Date() },
        })
          .sort({ dueDate: 1 })
          .limit(3)
          .select("title dueDate")
          .lean();
        
        // 3. Fee summary
        const fees = await StudentFee.find({ student: child._id })
          .populate("feeStructure", "name dueDate")
          .sort({ createdAt: -1 })
          .limit(5)
          .lean();
        
        // 4. Latest report card
        const latestReport = await ReportCard.findOne({ student: child._id })
          .sort({ createdAt: -1 })
          .populate("grades.subject", "name")
          .lean();
        
        return { name: child.name, success: true };
      })
    );
    console.log("Success:", childrenData);
  } catch (e) {
    console.error("Error building child data:", e);
  }
  process.exit(0);
}

test();
