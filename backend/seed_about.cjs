const mongoose = require("mongoose");
const { Page, SiteSetting, AboutPageSection } = require("./src/models.js");

async function run() {
  await mongoose.connect("mongodb://localhost:27017/iskcon-juhu-ipp");
  
  // Seed the "about" page if it doesn't exist
  const existingAbout = await Page.findOne({ slug: "about" });
  if (!existingAbout) {
    await Page.create({
      title: "About Us",
      slug: "about",
      pageName: "about",
      excerpt: "A spiritual education and personal excellence program for students.",
      bannerImage: "/uploads/temple-placeholder.jpg", // default or can be updated
      status: "active"
    });
    console.log("Created 'about' page.");
  } else {
    console.log("'about' page already exists.");
  }

  // Update SiteSettings with default stats if missing
  const site = await SiteSetting.findOne({ singletonKey: "site" });
  if (site && !site.aboutStats?.courses) {
    site.aboutStats = {
      courses: "6+",
      teachers: "6+",
      lessons: "12+",
      sundayClasses: "Every Week"
    };
    await site.save();
    console.log("Updated SiteSettings with aboutStats.");
  } else {
    console.log("SiteSettings aboutStats already exists or no site setting found.");
  }

  await mongoose.disconnect();
}

run().catch(console.error);
