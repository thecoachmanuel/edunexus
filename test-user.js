const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

async function check() {
  await mongoose.connect(process.env.MONGO_URL);
  const db = mongoose.connection.db;
  const lastUser = await db.collection('users').find({ role: 'admin' }).sort({ createdAt: -1 }).limit(1).toArray();
  console.log("Last user:", lastUser);
  process.exit(0);
}
check();
