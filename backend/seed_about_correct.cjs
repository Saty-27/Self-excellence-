const mongoose = require("mongoose");
const { Page, SiteSetting } = require("./src/models.js");
require("dotenv").config();

async function run() {
  const uri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/iskcon-lms";
  console.log("Connecting to:", uri);
  await mongoose.connect(uri);
  
  // Seed the "about" page if it doesn't exist
  const existingAbout = await Page.findOne({ slug: "about" });
  if (!existingAbout) {
    await Page.create({
      title: "About Us",
      slug: "about",
      pageName: "about",
      excerpt: "A spiritual education and personal excellence program for students.",
      bannerImage: "/uploads/temple-placeholder.jpg",
      status: "active"
    });
    console.log("Created 'about' page in correct DB.");
  } else {
    console.log("'about' page already exists in correct DB.");
  }

  // Update SiteSettings with default stats if missing
  const site = await SiteSetting.findOne({ singletonKey: "site" });
  if (site) {
    site.aboutStats = {
      courses: "6+",
      teachers: "6+",
      lessons: "12+",
      sundayClasses: "Every Week"
    };
    await site.save();
    console.log("Updated SiteSettings with aboutStats in correct DB.");
  } else {
    console.log("No site setting found to update in correct DB.");
  }

  await mongoose.disconnect();
}

run().catch(console.error);
