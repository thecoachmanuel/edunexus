const mongoose = require("mongoose");
async function run() {
  await mongoose.connect("mongodb://127.0.0.1:27017/edunexus");
  const User = mongoose.connection.collection("users");
  const parent = await User.findOne({ role: "parent" });
  if (parent) {
    console.log("Found parent:", parent.email);
  } else {
    console.log("No parent found");
  }
  process.exit();
}
run();
