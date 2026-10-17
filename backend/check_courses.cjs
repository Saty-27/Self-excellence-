const mongoose = require("mongoose");

const MONGO_URI = "mongodb://127.0.0.1:27017/iskcon-lms";

async function run() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB");
    
    // Dynamically retrieve all collections
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    console.log("Collections:", collections.map(c => c.name));

    const Course = mongoose.model("Course", new mongoose.Schema({}, { strict: false }));
    const courses = await Course.find({}).lean();
    console.log("Total courses in DB:", courses.length);
    console.log(JSON.stringify(courses.map(c => ({
      _id: c._id,
      title: c.title,
      status: c.status,
      isActive: c.isActive,
      slug: c.slug
    })), null, 2));
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
