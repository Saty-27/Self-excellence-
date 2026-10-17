const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { User } = require("./src/models.js");

async function run() {
  await mongoose.connect("mongodb://localhost:27017/iskcon-juhu-ipp");
  const user = await User.findOne({ email: "admin@iskconlms.com" }).select("+password");
  console.log("Admin email in DB:", user.email);
  console.log("Password hash in DB:", user.password);
  
  const isMatchDirect = await bcrypt.compare("Admin@123", user.password);
  console.log("bcrypt.compare match status:", isMatchDirect);
  
  const isMatchMethod = await user.matchPassword("Admin@123");
  console.log("user.matchPassword match status:", isMatchMethod);

  await mongoose.disconnect();
}
run().catch(console.error);
