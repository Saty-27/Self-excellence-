const mongoose = require("mongoose");
const { User } = require("./src/models.js");

async function run() {
  await mongoose.connect("mongodb://localhost:27017/iskcon-juhu-ipp");
  const users = await User.find({ email: "admin@iskconlms.com" });
  console.log("Found admin users:", users.length);
  if (users.length > 0) {
    console.log("Admin user:", users[0]);
  }
  await mongoose.disconnect();
}
run().catch(console.error);
