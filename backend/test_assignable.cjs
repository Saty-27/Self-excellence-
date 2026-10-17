const mongoose = require("mongoose");
const { Course, Enrollment, User } = require("./src/models");

const MONGO_URI = "mongodb://127.0.0.1:27017/iskcon-lms";

async function run() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB");

    const courses = await Course.find({}).lean();
    console.log("Found raw courses:", courses.length);

    const assignable = await Promise.all(courses.map(async (c) => {
      const enrolledCount = await Enrollment.countDocuments({ course: c._id });
      const primaryTeacher = c.primaryTeacherId ? await User.findById(c.primaryTeacherId).select("name email").lean() : null;
      return {
        _id: c._id,
        title: c.title,
        category: c.category,
        isActive: c.isActive,
        status: c.status,
        enrolledCount,
        primaryTeacher
      };
    }));

    console.log("Assignable courses output:");
    console.log(JSON.stringify(assignable, null, 2));

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
