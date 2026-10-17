const mongoose = require("mongoose");
const { User } = require("./src/models.js");
require("dotenv").config();

async function run() {
  const uri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/iskcon-lms";
  console.log("Connecting to:", uri);
  await mongoose.connect(uri);
  
  // Remove existing admin if any
  await User.deleteMany({ email: "admin@iskconlms.com" });
  
  const admin = await User.create({ 
    name: "Main Admin", 
    email: "admin@iskconlms.com", 
    password: "Admin@123", 
    role: "main_admin", 
    phone: "+91 90000 00001",
    status: "active" 
  });
  
  console.log("Successfully created admin user in correct DB:", admin.email);
  await mongoose.disconnect();
}
run().catch(console.error);
