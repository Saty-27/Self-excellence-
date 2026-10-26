import "dotenv/config";
import mongoose from "mongoose";
import {
  User,
  SiteSetting,
  FooterSetting,
  Testimonial,
  Blog,
  ImageGallery
} from "./models.js";

const IMG = {
  temple: "https://images.unsplash.com/photo-1544427920-c49ccfb85579?auto=format&fit=crop&w=1200&h=800&q=85",
  chaitanya: "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=1200&h=800&q=85",
  goloka: "https://images.unsplash.com/photo-1514222134-b57cbb8ce073?auto=format&fit=crop&w=1200&h=800&q=85",
  prabhupada: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1200&h=800&q=85",
  class1: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&h=800&q=85",
  class2: "https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?auto=format&fit=crop&w=1200&h=800&q=85",
  tripKashi: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&h=800&q=85",
  skyline: "https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1200&h=800&q=85"
};

const ISKCON_SITE_SETTING = {
  singletonKey: "site",
  siteName: "ISKCON Juhu Self-Excellence",
  logo: "/logo-black-header.png",
  favicon: "/favicon.ico",
  primaryColor: "#f52246",
  loginButtonText: "Login",
  registerButtonText: "Register",
  defaultSeoTitle: "ISKCON Juhu Self-Excellence",
  defaultSeoDescription:
    "Spiritual education, guided pilgrimages and weekly Sunday youth programmes at ISKCON Juhu, Mumbai.",
  aboutStats: { courses: "6+", teachers: "3+", lessons: "18+", sundayClasses: "Every Week" },
  socialLinks: {
    facebook: "https://facebook.com/iskconjuhu",
    instagram: "https://instagram.com/iskconjuhu",
    youtube: "https://youtube.com/@iskconjuhu"
  },
  headerLinks: [
    { label: "Home", url: "/", sortOrder: 1, status: "active" },
    { label: "About", url: "/about", sortOrder: 2, status: "active" },
    { label: "Courses", url: "/courses", sortOrder: 3, status: "active" },
    { label: "Trips", url: "/trips", sortOrder: 4, status: "active" },
    { label: "Visionaries", url: "/visionaries", sortOrder: 5, status: "active" },
    { label: "Blogs", url: "/blogs", sortOrder: 6, status: "active" },
    { label: "Media", url: "/gallery/images", sortOrder: 7, status: "active" },
    { label: "Contact", url: "/contact", sortOrder: 8, status: "active" }
  ]
};

const ISKCON_FOOTER_SETTING = {
  singletonKey: "footer",
  logo: "/logo-black-header.png",
  description:
    "ISKCON Juhu Self-Excellence helps students grow through scripture, discipline, community and practical spiritual learning.",
  copyrightText: "ISKCON Juhu Self-Excellence. All Rights Reserved.",
  copyrightYear: 2026,
  newsletterEnabled: true,
  contactDetails: {
    address: "ISKCON Juhu, Hare Krishna Land, Juhu, Mumbai 400049",
    phone: "+91 22 2620 6860",
    email: "selfexcellence@iskconjuhu.in"
  },
  socialLinks: {
    facebook: "https://facebook.com/iskconjuhu",
    instagram: "https://instagram.com/iskconjuhu",
    youtube: "https://youtube.com/@iskconjuhu"
  },
  columns: [
    {
      title: "Quick Links",
      links: [
        { label: "Home", url: "/" },
        { label: "About", url: "/about" },
        { label: "Courses", url: "/courses" },
        { label: "Trips", url: "/trips" },
        { label: "Contact", url: "/contact" }
      ]
    },
    {
      title: "Learning",
      links: [
        { label: "Visionaries", url: "/visionaries" },
        { label: "Blogs", url: "/blogs" },
        { label: "Video Blogs", url: "/video-blogs" },
        { label: "Image Gallery", url: "/gallery/images" }
      ]
    },
    {
      title: "Legal",
      links: [
        { label: "Privacy Policy", url: "/privacy-policy" },
        { label: "Terms and Conditions", url: "/terms-and-conditions" },
        { label: "Sitemap", url: "/sitemap" }
      ]
    }
  ]
};

export async function purgePrettyVisionData() {
  console.log("Checking and purging any leftover PrettyVision data...");

  // 1. Delete PrettyVision users
  const delUser = await User.deleteMany({ email: /prettyvision/i });
  if (delUser.deletedCount > 0) {
    console.log(`- Removed ${delUser.deletedCount} PrettyVision admin user(s)`);
  }

  // 2. Clean SiteSetting
  const site = await SiteSetting.findOne({ singletonKey: "site" }).lean();
  const isPrettySite =
    !site ||
    site.siteName?.toLowerCase().includes("pretty") ||
    site.defaultSeoTitle?.toLowerCase().includes("pretty") ||
    site.defaultSeoDescription?.toLowerCase().includes("eye care") ||
    site.logo?.includes("pv_logo") ||
    site.email?.includes("prettyvision") ||
    site.topBarPhone?.includes("095940") ||
    site.primaryCtaText?.toLowerCase().includes("eye test") ||
    site.headerLinks?.length === 0;

  if (isPrettySite) {
    // Delete contaminated document to strip stray optical fields
    await SiteSetting.deleteMany({ singletonKey: "site" });
    await SiteSetting.create(ISKCON_SITE_SETTING);
    console.log("+ Replaced SiteSetting with official ISKCON Juhu Self-Excellence config");
  }

  // 3. Clean FooterSetting
  const footer = await FooterSetting.findOne({ singletonKey: "footer" }).lean();
  const isPrettyFooter =
    !footer ||
    footer.description?.toLowerCase().includes("pretty") ||
    footer.copyrightText?.toLowerCase().includes("pretty") ||
    footer.contactDetails?.email?.includes("prettyvision") ||
    footer.columns?.some((c) =>
      c.links?.some((l) => /eyewear|glasses|contact-lens|eye-exam/i.test(l.url || l.label))
    );

  if (isPrettyFooter) {
    // Delete contaminated document to strip optical columns & contacts
    await FooterSetting.deleteMany({ singletonKey: "footer" });
    await FooterSetting.create(ISKCON_FOOTER_SETTING);
    console.log("+ Replaced FooterSetting with official ISKCON Juhu footer config");
  }

  // 4. Delete optical / PrettyVision testimonials
  const delTestimonials = await Testimonial.deleteMany({
    $or: [
      { testimonialText: /ray-ban|pretty vision|optical|frames|eye test|optometrist/i },
      { quote: /ray-ban|pretty vision|optical|frames|eye test|optometrist/i },
      { name: /rohit mehta|priya shah|amit desai/i },
      { userName: /rohit mehta|priya shah|amit desai/i },
      { designation: /kalina|santacruz|bkc/i }
    ]
  });
  if (delTestimonials.deletedCount > 0) {
    console.log(`- Removed ${delTestimonials.deletedCount} optical eyewear testimonial(s)`);
  }

  // Ensure authentic ISKCON testimonials exist
  const existingTestimonialsCount = await Testimonial.countDocuments();
  if (existingTestimonialsCount === 0) {
    const studentTestimonials = [
      ["Aarav Mehta", "Engineering student", "The classes gave me a clear way to think, study, and stay connected with Krishna."],
      ["Kavya Shah", "Final year, B.Com", "I came for one Sunday and stayed for a year. The questions session is what kept me."],
      ["Rohan Iyer", "Software engineer", "Mayapur changed how I think about my mornings. I have kept the 5 AM habit since."],
      ["Ananya Rao", "Medical student", "The Gita course is the only thing in my week that is not about marks."],
      ["Vivek Nair", "Working professional", "I expected to feel like an outsider. Nobody made me feel like one."],
      ["Meera Joshi", "Teacher", "I bring my students now. The explanations are pitched for people who are new."]
    ];

    await Testimonial.insertMany(
      studentTestimonials.map(([name, designation, quote], i) => ({
        name,
        userName: name,
        designation,
        quote,
        testimonialText: quote,
        rating: 5,
        image: IMG.prabhupada,
        status: "approved",
        showOnHomepage: true,
        isFeatured: true,
        sortOrder: i + 1
      }))
    );
    console.log(`+ Seeded ${studentTestimonials.length} authentic ISKCON student reflections`);
  }

  // 5. Delete optical / PrettyVision blogs
  const delBlogs = await Blog.deleteMany({
    $or: [
      { title: /eye|frame|lens|optometrist/i },
      { slug: /eye|frame|lens|optometrist/i },
      { category: /eye care|style guide|lens technology/i },
      { tags: /eye care|style guide|lens technology/i }
    ]
  });
  if (delBlogs.deletedCount > 0) {
    console.log(`- Removed ${delBlogs.deletedCount} optical eyewear blog(s)`);
  }

  // Ensure authentic ISKCON blogs exist
  const existingBlogsCount = await Blog.countDocuments();
  if (existingBlogsCount === 0) {
    const spiritualBlogs = [
      ["Why Students Need Spiritual Anchoring", "Youth", IMG.prabhupada, "Exam seasons pass. The habits you build around them do not."],
      ["Five Lessons from the Bhagavad-gita", "Wisdom", IMG.temple, "Not a summary of the text, but five things students keep returning to."],
      ["The Power of Satsang", "Community", IMG.chaitanya, "Why who you sit with on a Sunday evening changes what you do on a Tuesday."],
      ["Starting a Japa Practice That Lasts", "Practice", IMG.goloka, "Most people begin with sixteen rounds and stop by Thursday. Start smaller."],
      ["What a Pilgrimage Actually Involves", "Pilgrimage", IMG.tripKashi, "Early mornings, long walks, and a great deal of waiting. Here is the honest version."],
      ["Reading the Bhagavatam Slowly", "Scripture", IMG.skyline, "The First Canto takes a year if you read it properly. That is the point."]
    ];

    await Blog.insertMany(
      spiritualBlogs.map(([title, category, image, shortDescription], i) => ({
        title,
        slug: title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""),
        image,
        category,
        shortDescription,
        content: `${shortDescription}\n\nThis reflection comes out of conversations in the Sunday programme and the questions students send through the doubt box. It is written for people balancing study or work with a developing practice, not for scholars.\n\nIf something here raises a question, the comment box on any lesson reaches a teacher directly, and the Sunday class always keeps time for questions.`,
        tags: [category, "Self-Excellence"],
        status: "published",
        featured: i < 2,
        showOnHomepage: true
      }))
    );
    console.log(`+ Seeded ${spiritualBlogs.length} authentic ISKCON spiritual blogs`);
  }

  // 6. Ensure ImageGallery has entries so Photo & Video Gallery is full
  const galleryCount = await ImageGallery.countDocuments();
  if (galleryCount === 0) {
    const galleryItems = [
      IMG.temple, IMG.chaitanya, IMG.goloka, IMG.prabhupada,
      IMG.class1, IMG.class2, IMG.tripKashi, IMG.skyline
    ];
    await ImageGallery.insertMany(
      galleryItems.map((image, i) => ({
        title: `Self-Excellence Moment ${i + 1}`,
        image,
        category: "Programme",
        description: "Moments from our Sunday classes, youth gatherings, festivals and sacred pilgrimages.",
        status: "active",
        showInMediaHighlight: true,
        sortOrder: i + 1
      }))
    );
    console.log(`+ Seeded ${galleryItems.length} photos into ImageGallery`);
  }

  // 7. Drop stray optical eyewear collections if they exist in MongoDB
  try {
    const db = mongoose.connection.db;
    const dropCandidates = [
      "products",
      "brands",
      "collections",
      "storelocations",
      "targetaudiences",
      "producttypes",
      "services",
      "categories"
    ];
    for (const name of dropCandidates) {
      await db.collection(name).drop().catch(() => null);
    }
    console.log("- Dropped stray optical collections (products, brands, etc.)");
  } catch (err) {
    // Ignore drop errors if collection doesn't exist
  }

  console.log("Purge of PrettyVision data completed successfully.\n");
}

// Standalone runner
if (process.argv[1]?.endsWith("clean-prettyvision.js")) {
  const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/self-excellence";
  mongoose
    .connect(mongoUri)
    .then(async () => {
      await purgePrettyVisionData();
      await mongoose.disconnect();
      process.exit(0);
    })
    .catch((err) => {
      console.error("Purge error:", err);
      process.exit(1);
    });
}
