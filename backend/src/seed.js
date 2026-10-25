import "dotenv/config";
import mongoose from "mongoose";
import {
  AboutPageSection,
  Benefit,
  Blog,
  ContactMessage,
  Course,
  Enrollment,
  FooterSetting,
  HeroBanner,
  ImageGallery,
  LegalPage,
  Lesson,
  Page,
  PageSection,
  Preacher,
  Progress,
  SiteSetting,
  Subscriber,
  Testimonial,
  UpcomingClass,
  User,
  VideoBlog,
  VideoGallery
} from "./models.js";

const slugify = (value = "") => value.toString().trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const img = (id, w = 1200, h = 800) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&h=${h}&q=85`;
const images = {
  hero: img("photo-1544427920-c49ccfb85579"),
  temple: img("photo-1582510003544-4d00b7f74220"),
  class: img("photo-1523240795612-9a054b0db644"),
  youth: img("photo-1517486808906-6ca8b3f04846"),
  books: img("photo-1497633762265-9d179a990aa6"),
  meditation: img("photo-1506126613408-eca07ce68773"),
  devotion: img("photo-1514222134-b57cbb8ce073"),
  festival: img("photo-1500530855697-b586d89ba3ee"),
  learning: img("photo-1509062522246-3755977927d7")
};

const reset = async () => {
  await Promise.all([
    User.deleteMany({}),
    HeroBanner.deleteMany({}),
    Course.deleteMany({}),
    Lesson.deleteMany({}),
    Enrollment.deleteMany({}),
    Progress.deleteMany({}),
    UpcomingClass.deleteMany({}),
    PageSection.deleteMany({}),
    AboutPageSection.deleteMany({}),
    Preacher.deleteMany({}),
    Blog.deleteMany({}),
    VideoBlog.deleteMany({}),
    ImageGallery.deleteMany({}),
    VideoGallery.deleteMany({}),
    Subscriber.deleteMany({}),
    ContactMessage.deleteMany({}),
    FooterSetting.deleteMany({}),
    SiteSetting.deleteMany({}),
    LegalPage.deleteMany({}),
    Benefit.deleteMany({}),
    Testimonial.deleteMany({}),
    Page.deleteMany({})
  ]);
};

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/iskcon-lms", { serverSelectionTimeoutMS: 5000 });
  await reset();

  const [admin, teacher, student, teacherTwo, teacherThree] = await User.create([
    { name: "Main Admin", email: "admin@iskconlms.com", password: "Admin@123", role: "main_admin", phone: "+91 90000 00001" },
    {
      name: "HG Radheshyam Das",
      email: "teacher@iskconlms.com",
      password: "Teacher@123",
      role: "teacher",
      phone: "+91 90000 00002",
      profileImage: images.devotion,
      bio: "A senior preacher guiding students through the Bhagavad-gita, devotional habits, and practical life wisdom.",
      expertise: ["Bhagavad-gita", "Youth guidance", "Leadership"],
      permissions: { canCreateLesson: true, canEditLesson: true, canCreateBlog: true, canCreateVideoBlog: true, canViewStudents: true, canViewAnalytics: true }
    },
    { name: "Student Dev", email: "student@iskconlms.com", password: "Student@123", role: "student", phone: "+91 90000 00003" },
    {
      name: "HG Govind Priya Das",
      email: "govind.teacher@iskconlms.com",
      password: "Teacher@123",
      role: "teacher",
      profileImage: images.meditation,
      bio: "Known for connecting Vedic wisdom with modern decision-making and personal discipline.",
      expertise: ["Bhagavatam", "Decision making", "Sadhana"],
      permissions: { canCreateLesson: true, canEditLesson: true, canViewStudents: true }
    },
    {
      name: "HG Madhava Mohan Das",
      email: "madhava.teacher@iskconlms.com",
      password: "Teacher@123",
      role: "teacher",
      profileImage: images.temple,
      bio: "A thoughtful mentor for youth programs, value education, and ipp journeys.",
      expertise: ["Self excellence", "Temple culture", "Youth mentoring"],
      permissions: { canCreateLesson: true, canEditLesson: true, canCreateBlog: true, canViewStudents: true }
    }
  ]);

  const preacherData = [
    ["HG Radheshyam Das", teacher, "Senior Gita Mentor", images.devotion],
    ["HG Govind Priya Das", teacherTwo, "Bhagavatam Teacher", images.meditation],
    ["HG Madhava Mohan Das", teacherThree, "Youth Mentor", images.temple],
    ["HG Shyam Sundar Das", null, "Life Coach", images.learning],
    ["HG Nityananda Das", null, "Kirtan Guide", images.festival],
    ["HG Gauranga Das", null, "Wisdom Facilitator", images.books]
  ];
  await Preacher.create(
    preacherData.map(([name, user, designation, image], index) => ({
      name,
      slug: slugify(name),
      image,
      designation,
      type: index < 2 ? "Founder" : "Team Member",
      shortBio: `${name} shares timeless spiritual knowledge in a practical, student-friendly way.`,
      fullBio: "With years of service in preaching and mentoring, this teacher helps students absorb spiritual principles through clear examples, discussion, practice, and personal care.",
      experience: `${8 + index} years`,
      specialization: ["Scripture", "Youth guidance", "Self excellence"],
      email: user?.email,
      phone: user?.phone,
      user: user?._id,
      status: "active",
      showOnHomepage: true,
      sortOrder: index + 1
    }))
  );

  await HeroBanner.create([
    {
      title: "ISKCON Juhu Self-Excellence",
      subtitle: "Classes every Sunday, 6 PM to 9 PM",
      buttonText: "Explore Courses",
      buttonLink: "/courses",
      desktopImage: img("photo-1544427920-c49ccfb85579", 1920, 820),
      tabletImage: img("photo-1544427920-c49ccfb85579", 1200, 760),
      mobileImage: img("photo-1544427920-c49ccfb85579", 720, 920),
      order: 1,
      isActive: true
    },
    {
      title: "Learn Gita Step by Step",
      subtitle: "Structured lessons, videos, and downloadable notes",
      buttonText: "Start Learning",
      buttonLink: "/courses/gita-gyan",
      desktopImage: img("photo-1497633762265-9d179a990aa6", 1920, 820),
      tabletImage: img("photo-1497633762265-9d179a990aa6", 1200, 760),
      mobileImage: img("photo-1497633762265-9d179a990aa6", 720, 920),
      order: 2,
      isActive: true
    },
    {
      title: "",
      subtitle: "",
      buttonText: "",
      buttonLink: "",
      desktopImage: img("photo-1500530855697-b586d89ba3ee", 1920, 820),
      tabletImage: img("photo-1500530855697-b586d89ba3ee", 1200, 760),
      mobileImage: img("photo-1500530855697-b586d89ba3ee", 720, 920),
      order: 3,
      isActive: true
    }
  ]);

  const courseRows = [
    ["Gita Gyan", teacher, images.books],
    ["Bhagavatam Classes", teacherTwo, images.temple],
    ["Shivpuran Classes", teacherThree, images.devotion],
    ["Life Lesson", teacher, images.youth],
    ["Life Goal", teacherTwo, images.meditation],
    ["Decision Making", teacherThree, images.learning]
  ];
  const courses = await Course.create(
    courseRows.map(([title, courseTeacher, image], index) => ({
      title,
      slug: slugify(title),
      thumbnail: image,
      bannerImage: image,
      shortDescription: "A practical spiritual course designed by experienced devotees for modern student life.",
      description: "<p>This course combines scripture, reflection, guided practice, and practical assignments for spiritual and personal excellence.</p><ul><li>Weekly guided learning</li><li>Downloadable notes</li><li>Progress tracking</li></ul>",
      category: index % 2 === 0 ? "Scripture" : "Self-Excellence",
      level: index < 2 ? "Beginner" : index < 4 ? "Intermediate" : "Advanced",
      teacher: courseTeacher._id,
      duration: `${4 + index} weeks`,
      priceType: "Free",
      price: 0,
      isFree: true,
      isActive: true,
      order: index + 1,
      featured: index < 3,
      showOnHomepage: true,
      status: "published",
      whatYouWillLearn: ["Understand core spiritual principles", "Build daily habits", "Apply Vedic wisdom", "Reflect through lessons and notes"],
      faq: [{ question: "Is this beginner friendly?", answer: "Yes, every course starts with simple foundations." }],
      createdBy: admin._id,
      seoTitle: `${title} Course`,
      seoDescription: "Learn through ISKCON Juhu Self-Excellence."
    }))
  );

  const lessons = courses.flatMap((course) => [
    {
      course: course._id,
      title: `${course.title} - Foundation`,
      slug: "foundation",
      description: "Begin with the core ideas, class orientation, and spiritual context.",
      videoType: "youtube",
      youtubeUrl: "https://www.youtube.com/embed/ysz5S6PUM-U",
      videoUrl: "https://www.youtube.com/embed/ysz5S6PUM-U",
      thumbnail: course.thumbnail,
      pdfFile: "/uploads/sample/foundation-notes.pdf",
      attachmentFile: "/uploads/sample/reflection-sheet.pdf",
      duration: "18 min",
      order: 1,
      sortOrder: 1,
      isPreview: true,
      isActive: true,
      status: "active",
      createdBy: admin._id
    },
    {
      course: course._id,
      title: `${course.title} - Practical Application`,
      slug: "practical-application",
      description: "Apply the teaching through examples, reflection prompts, and practical commitments.",
      videoType: "youtube",
      youtubeUrl: "https://www.youtube.com/embed/jfKfPfyJRdk",
      videoUrl: "https://www.youtube.com/embed/jfKfPfyJRdk",
      thumbnail: course.thumbnail,
      pdfFile: "/uploads/sample/practice-notes.pdf",
      duration: "24 min",
      order: 2,
      sortOrder: 2,
      isPreview: false,
      isActive: true,
      status: "active",
      createdBy: admin._id
    }
  ]);
  await Lesson.create(lessons);

  await UpcomingClass.create([
    {
      title: "The Price of Pleasing Your Palate",
      slug: "the-price-of-pleasing-your-palate",
      image: "/uploads/upcoming-classes/the-price-of-pleasing-your-palate.jpg",
      date: new Date("2026-10-25T18:00:00+05:30"),
      time: "6 PM to 9 PM",
      venue: "ISKCON Juhu Auditorium",
      speaker: "Narottam Das Thakur Prabhu (Senior Data Analyst)",
      seats: 120,
      buttonText: "Register Now",
      buttonLink: "/contact",
      shortDescription: "An insightful talk exploring the deeper consequences and spiritual impact of satisfying food cravings and sense gratification, guiding youth toward mindful living and self-control.",
      fullDescription: `Join us for an enlightening discourse titled "The Price of Pleasing Your Palate" presented by Narottam Das Thakur Prabhu (Senior Data Analyst) as part of the Self Excellence Youth series at ISKCON Juhu.\n\nThis session delves into understanding dietary habits, sense control, and the true value of mindful spiritual choices over immediate sensory pleasures.\n\nThe evening is open to everyone, whether or not you have attended before. There is no charge, and prasadam is served to all who stay.`,
      videoUrl: "http://www.youtube.com/watch?v=NknwV0wZMF8",
      youtubeUrl: "http://www.youtube.com/watch?v=NknwV0wZMF8",
      status: "active",
      showOnHomepage: true,
      sortOrder: 1
    },
    {
      title: "What You Eat Matters",
      slug: "what-you-eat-matters",
      image: "/uploads/upcoming-classes/what-you-eat-matters.jpg",
      date: new Date("2026-10-25T18:00:00+05:30"),
      time: "6 PM to 9 PM",
      venue: "ISKCON Juhu Auditorium",
      speaker: "HG Adbhuta Hari Prabhuji (Monk, Life Coach - Europe)",
      seats: 120,
      buttonText: "Register Now",
      buttonLink: "/contact",
      shortDescription: "An inspiring session exploring how our food choices influence our physical vitality, mental clarity, and spiritual consciousness.",
      fullDescription: `Join us for a transformative session titled "What You Eat Matters" presented by HG Adbhuta Hari Prabhuji (Monk, Life Coach - Europe) as part of the Self Excellence Youth series at ISKCON Juhu.\n\nIn a fast-paced world dominated by instant gratification and unhealthy dietary habits, this discourse sheds light on the profound link between what we consume, our state of mind, and our spiritual well-being. Learn practical insights on cultivating mindful, sattvic eating habits that elevate both body and soul.\n\nThe evening is open to everyone, whether or not you have attended before. There is no charge, and prasadam is served to all who stay.`,
      videoUrl: "http://www.youtube.com/watch?v=KKGolyVwswM",
      youtubeUrl: "http://www.youtube.com/watch?v=KKGolyVwswM",
      status: "active",
      showOnHomepage: true,
      sortOrder: 2
    },
    {
      title: "Thursday's Special Srimad Bhagavad Gita Lecture",
      slug: "thursdays-special-srimad-bhagavad-gita-lecture",
      image: "/uploads/upcoming-classes/thursdays-special-srimad-bhagavad-gita-lecture.jpg",
      date: new Date("2026-10-29T20:00:00+05:30"),
      time: "8 PM Onwards",
      venue: "Chakra Hall, ISKCON Juhu",
      speaker: "HG Adbhuta Hari Prabhuji (Monk, Life Coach - Europe)",
      seats: 120,
      buttonText: "Register Now",
      buttonLink: "/contact",
      shortDescription: "A special Thursday Bhagavad Gita discourse for youth exploring timeless spiritual wisdom, life direction, and inner clarity. (Note: Only for boys).",
      fullDescription: `Join us for Thursday's Special Srimad Bhagavad Gita Lecture delivered by HG Adbhuta Hari Prabhuji (Monk, Life Coach - Europe) at ISKCON Juhu.\n\nDive deep into the practical philosophy of the Bhagavad Gita to navigate life's daily dilemmas, discover purposeful living, and cultivate lasting spiritual strength. Please note that this specific session is organized exclusively for boys.\n\nThe evening is open to all boys, whether or not you have attended before. There is no charge, and sumptuous prasadam is served to all who stay!`,
      videoUrl: "",
      youtubeUrl: "",
      status: "active",
      showOnHomepage: true,
      sortOrder: 3
    }
  ]);

  await Benefit.create(["Inner clarity", "Disciplined habits", "Better relationships", "Spiritual confidence", "Purposeful study", "Service mindset"].map((title, index) => ({
    title,
    image: [images.meditation, images.learning, images.youth, images.books, images.class, images.temple][index],
    shortDescription: "Grow through reflective learning, discussion, and spiritual practice.",
    fullDescription: "Self-Excellence helps students translate wisdom into daily choices and long-term transformation.",
    buttonText: "Read More",
    buttonLink: "/about",
    status: "active",
    sortOrder: index + 1
  })));

  await Blog.create(["Why Students Need Spiritual Anchoring", "Five Lessons from the Bhagavad-gita", "How to Build a Sunday Learning Habit", "Decision Making with Dharma", "Purpose Beyond Performance", "The Power of Satsang"].map((title, index) => ({
    title,
    slug: slugify(title),
    image: [images.youth, images.books, images.class, images.learning, images.meditation, images.festival][index],
    shortDescription: "A practical reflection for students and seekers in modern life.",
    content: "<p>Spiritual education becomes powerful when it touches ordinary decisions. These reflections help students think deeply, act responsibly, and remember Krishna while living active lives.</p>",
    listItems: ["Reflect honestly", "Practice daily", "Stay connected with satsang"],
    author: admin._id,
    category: index % 2 === 0 ? "Youth" : "Wisdom",
    tags: ["ISKCON", "Self-Excellence", "Students"],
    status: "published",
    featured: index < 2,
    showOnHomepage: true
  })));

  await VideoBlog.create(["Sunday Class Highlight", "How to Start Reading Gita", "Festival Reflections", "Teacher Message for Students"].map((title, index) => ({
    title,
    slug: slugify(title),
    thumbnail: [images.class, images.books, images.festival, images.devotion][index],
    videoUrl: index % 2 === 0 ? "https://www.youtube.com/embed/ysz5S6PUM-U" : "https://player.vimeo.com/video/76979871",
    shortDescription: "Watch a short spiritual learning highlight from our community.",
    description: "A curated video message designed to inspire steady practice and deeper learning.",
    category: "Highlights",
    tags: ["Video", "ISKCON", "Youth"],
    status: "published",
    showOnHomepage: true
  })));

  await ImageGallery.create(Array.from({ length: 8 }).map((_, index) => ({
    title: `Self-Excellence Moment ${index + 1}`,
    image: [images.temple, images.festival, images.class, images.youth, images.books, images.meditation, images.learning, images.devotion][index],
    category: index % 2 === 0 ? "Classes" : "Temple",
    description: "A glimpse from temple activities, classes, and spiritual learning sessions.",
    status: "active",
    showInMediaHighlight: index < 4,
    sortOrder: index + 1
  })));

  await VideoGallery.create(Array.from({ length: 4 }).map((_, index) => ({
    title: `Video Gallery Highlight ${index + 1}`,
    thumbnail: [images.class, images.festival, images.temple, images.learning][index],
    videoUrl: "https://www.youtube.com/embed/ysz5S6PUM-U",
    description: "Short video highlight from ISKCON Juhu activities.",
    category: "Highlights",
    status: "active",
    showInMediaHighlight: index < 2,
    sortOrder: index + 1
  })));

  await Testimonial.create(["Aarav Mehta", "Kavya Shah", "Rohan Iyer"].map((name, index) => ({
    name,
    designation: "Self-Excellence Student",
    image: [images.youth, images.meditation, images.learning][index],
    quote: "The classes gave me a clear way to think, study, and stay connected with Krishna.",
    rating: 5,
    status: "active",
    sortOrder: index + 1
  })));

  await PageSection.create([
    { pageName: "home", sectionKey: "upcoming_classes", sectionTitle: "Upcoming Classes On Sunday", sectionSubtitle: "Timing 6 PM to 9 PM", sortOrder: 2, status: "active" },
    { pageName: "home", sectionKey: "courses", sectionTitle: "Explore All the Courses", sectionSubtitle: "Designed by Experts", sortOrder: 3, status: "active" },
    { pageName: "home", sectionKey: "about", sectionTitle: "Empowering Students to Achieve Spiritual & Personal Excellence", sectionSubtitle: "Welcome to ISKCON Juhu Self-Excellence", content: { description: "The ISKCON Juhu Self-Excellence Classes help students align their lives with higher spiritual values while excelling in academics, relationships, and personal growth." }, images: [images.temple, images.youth], buttonText: "Know More", buttonLink: "/about", sortOrder: 4, status: "active" },
    { pageName: "home", sectionKey: "video_intro", sectionTitle: "Experience a Class", sectionSubtitle: "Watch how spiritual wisdom becomes practical learning", image: images.class, videoUrl: "https://www.youtube.com/embed/ysz5S6PUM-U", sortOrder: 5, status: "active" },
    { pageName: "home", sectionKey: "preachers", sectionTitle: "Our Qualified Preachers", sectionSubtitle: "Experienced Devotees Trained to Lead with Purpose and Purity", sortOrder: 6, status: "active" },
    { pageName: "home", sectionKey: "benefits", sectionTitle: "Benefits of Self-Excellence Classes", sectionSubtitle: "Self-Excellence is not just improvement - it is inner transformation.", sortOrder: 7, status: "active" },
    { pageName: "home", sectionKey: "blogs", sectionTitle: "Latest Blogs", sectionSubtitle: "Insights for spiritual living and student excellence", buttonText: "View All Blogs", buttonLink: "/blogs", sortOrder: 8, status: "active" },
    { pageName: "home", sectionKey: "video_blogs", sectionTitle: "Video Blogs", sectionSubtitle: "Short messages, class highlights, and festival reflections", buttonText: "Watch More", buttonLink: "/video-blogs", sortOrder: 9, status: "active" },
    { pageName: "home", sectionKey: "media_highlight", sectionTitle: "Media Highlight", sectionSubtitle: "Glimpses of our temple, festivals, and spiritual activities.", sortOrder: 10, status: "active" },
    { pageName: "home", sectionKey: "testimonials", sectionTitle: "Student Reflections", sectionSubtitle: "How the classes are shaping hearts and habits", sortOrder: 11, status: "active" },
    { pageName: "home", sectionKey: "newsletter", sectionTitle: "Signup for latest news and insights from ISKCON Juhu Self-Excellence", sortOrder: 12, status: "active" }
  ]);

  await AboutPageSection.create([
    { sectionTitle: "Our Mission", sectionSubtitle: "Spiritual education for everyday excellence", description: "To empower students with timeless Vedic wisdom, a devotional support system, and practical tools for disciplined, joyful living.", image: images.temple, sortOrder: 1, status: "active" },
    { sectionTitle: "Our Vision", sectionSubtitle: "Strong minds, soft hearts, purposeful lives", description: "We envision young people who combine academic and professional excellence with character, compassion, and Krishna consciousness.", image: images.youth, sortOrder: 2, status: "active" },
    { sectionTitle: "Why This Program Exists", sectionSubtitle: "Because students need more than information", description: "Self-Excellence creates a nourishing space for questions, friendship, scripture, and inner growth.", image: images.learning, sortOrder: 3, status: "active" },
    { sectionTitle: "Spiritual Education and Personal Development", sectionSubtitle: "A complete approach", description: "Each class blends philosophical clarity, discussion, meditation, reflection, and practical application.", image: images.books, buttonText: "Explore Courses", buttonLink: "/courses", sortOrder: 4, status: "active" }
  ]);

  await SiteSetting.create({
    singletonKey: "site",
    logo: "/logo-black-header.png",
    favicon: "/favicon.svg",
    siteName: "ISKCON Juhu Self-Excellence",
    primaryColor: "#f52246",
    headerLinks: [
      { label: "Home", url: "/", sortOrder: 1, status: "active" },
      { label: "About", url: "/about", sortOrder: 2, status: "active" },
      { label: "Courses", url: "/courses", sortOrder: 3, status: "active" },
      { label: "Visionaries", url: "/visionaries", sortOrder: 4, status: "active" },
      { label: "Blogs", url: "/blogs", sortOrder: 5, status: "active" },
      { label: "Media", url: "/gallery/images", sortOrder: 6, status: "active" },
      { label: "Contact", url: "/contact", sortOrder: 7, status: "active" }
    ],
    loginButtonText: "Login",
    registerButtonText: "Register",
    defaultSeoTitle: "ISKCON Juhu Self-Excellence LMS",
    defaultSeoDescription: "A premium spiritual learning platform for students and seekers."
  });

  await FooterSetting.create({
    singletonKey: "footer",
    logo: "/logo-black-header.png",
    description: "ISKCON Juhu Self-Excellence helps students grow through scripture, discipline, community, and practical spiritual learning.",
    columns: [
      { title: "Quick Links", links: [{ label: "Home", url: "/" }, { label: "About", url: "/about" }, { label: "Courses", url: "/courses" }, { label: "Contact", url: "/contact" }] },
      { title: "Learning", links: [{ label: "Visionaries", url: "/visionaries" }, { label: "Blogs", url: "/blogs" }, { label: "Video Blogs", url: "/video-blogs" }, { label: "Image Gallery", url: "/gallery/images" }] },
      { title: "Legal", links: [{ label: "Privacy Policy", url: "/privacy-policy" }, { label: "Terms and Conditions", url: "/terms-and-conditions" }, { label: "Sitemap", url: "/sitemap" }] }
    ],
    contactDetails: { address: "ISKCON Juhu, Hare Krishna Land, Juhu, Mumbai", phone: "+91 22 2620 6860", email: "selfexcellence@iskconjuhu.in" },
    copyrightText: "ISKCON Juhu Self-Excellence. All Rights Reserved.",
    copyrightYear: 2026,
    newsletterEnabled: true
  });

  await LegalPage.create([
    { slug: "privacy-policy", title: "Privacy Policy", content: "<h2>Information We Collect</h2><p>We collect account, enrollment, progress, subscription, and contact form information to operate the LMS.</p><h2>How We Use Your Information</h2><p>Data is used to provide course access, track learning progress, respond to enquiries, improve content, and send opted-in updates.</p><h2>Student Data</h2><p>Student progress, lesson completion, and enrollment details are stored securely.</p><h2>Cookies and Tracking</h2><p>Basic traffic logs help us understand page visits and improve the platform.</p><h2>Data Security</h2><p>We use authentication, hashed passwords, and role-based access to protect information.</p>", status: "active" },
    { slug: "terms-and-conditions", title: "Terms and Conditions", content: "<h2>Use of Website</h2><p>This platform is for spiritual education, student learning, and community engagement.</p><h2>Student Account Rules</h2><p>Users must keep login details secure and use learning resources respectfully.</p><h2>Course Access</h2><p>Lessons, videos, PDFs, and other materials are provided for enrolled users according to course rules.</p><h2>Intellectual Property</h2><p>All course material belongs to the respective creators and ISKCON Juhu Self-Excellence unless stated otherwise.</p>", status: "active" }
  ]);

  await Page.create({ title: "Contact ISKCON Juhu Self-Excellence", slug: "contact", pageName: "contact", bannerImage: images.temple, excerpt: "Reach out for classes, enrollment, volunteer opportunities, and program enquiries.", content: "<p>Visit us at ISKCON Juhu or send a message through the contact form. Our team will respond soon.</p>", status: "active" });
  await Subscriber.create({ email: "subscriber@example.com" });
  await ContactMessage.create({ name: "Sample Visitor", email: "visitor@example.com", phone: "+91 90000 00999", subject: "Course enquiry", message: "I would like to know more about the Sunday classes." });

  const enrollment = await Enrollment.create({ student: student._id, course: courses[0]._id });
  const firstLesson = await Lesson.findOne({ course: courses[0]._id, slug: "foundation" });
  await Progress.create({ student: student._id, course: courses[0]._id, lesson: firstLesson._id, isCompleted: true, completedAt: new Date(), lastWatchedAt: new Date() });

  console.log("Seed completed successfully");
  console.log("Admin: admin@iskconlms.com / Admin@123");
  console.log("Teacher: teacher@iskconlms.com / Teacher@123");
  console.log("Student: student@iskconlms.com / Student@123");
  console.log(`Sample enrollment id: ${enrollment._id}`);
  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
