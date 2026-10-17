const mongoose = require("mongoose");
const { User } = require("./src/models.js");

const MONGO_URI = "mongodb://127.0.0.1:27017/iskcon-lms";

async function run() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB");

    const users = await User.find({ role: "main_admin" }).lean();
    console.log("Admins:", JSON.stringify(users.map(u => ({
      _id: u._id,
      name: u.name,
      email: u.email,
      role: u.role
    })), null, 2));

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
