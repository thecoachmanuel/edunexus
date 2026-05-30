require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function test() {
  await mongoose.connect(process.env.MONGODB_URI);
  const Timetable = require('./src/lib/models/timetable').default;
  const timetables = await Timetable.find({}).populate('schedule.periods.teacher').lean();
  console.log("Found timetables:", timetables.length);
  if (timetables.length > 0) {
     const tt = timetables[0];
     console.log("Teacher in period 0:", tt.schedule[0].periods[0].teacher);
  }
  process.exit(0);
}
test();
