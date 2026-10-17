const mongoose = require("mongoose");
const { User } = require("./src/models.js");

async function run() {
  await mongoose.connect("mongodb://localhost:27017/iskcon-juhu-ipp");
  
  const admin = await User.create({ 
    name: "Main Admin", 
    email: "admin@iskconlms.com", 
    password: "Admin@123", 
    role: "main_admin", 
    phone: "+91 90000 00001",
    status: "active" 
  });
  
  console.log("Successfully created admin user:", admin.email);
  await mongoose.disconnect();
}
run().catch(console.error);
