import "dotenv/config";
import mongoose from "mongoose";
import { User } from "./src/models.js";

async function run() {
  const uri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/self-excellence";
  console.log("Connecting to MongoDB:", uri);
  await mongoose.connect(uri);

  const email = (process.argv[2] || "").trim().toLowerCase();
  const password = process.argv[3];
  const role = process.argv[4] || "main_admin"; // "main_admin" grants full unrestricted owner access

  if (!email || !password) {
    console.error("Usage: node set_admin.js <email> <password> [role]");
    process.exit(1);
  }

  let user = await User.findOne({ email });

  if (user) {
    user.password = password;
    user.role = role;
    user.status = "active";
    user.emailVerified = true;
    await user.save();
    console.log(`\n Successfully updated existing user:`);
  } else {
    user = await User.create({
      name: "Admin User",
      email,
      password,
      role,
      status: "active",
      emailVerified: true
    });
    console.log(`\n Successfully created new user:`);
  }

  console.log(`Email:    ${user.email}`);
  console.log(`Role:     ${user.role}`);
  console.log(`Status:   ${user.status}\n`);

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("Error setting admin user:", err);
  process.exit(1);
});
