/* ============================================================
   Demo dataset
   ------------------------------------------------------------
   Fills every section of the platform with working content so the
   site can be shown to someone without any part of it looking
   unfinished. Everything it writes is editable in the admin panel
   afterwards, exactly like real content.

   Run with:   npm run seed:demo

   It CLEARS the collections it touches first, so running it again
   resets the demo to a known state. It is destructive by design —
   never point it at a database holding real records.

   A note on the content: the temples, scriptures and festivals are
   real. The people are not. Teacher biographies, student names,
   testimonials and bookings are written for demonstration and
   should be replaced before anything is shown publicly as fact.
   ============================================================ */

import "dotenv/config";
import mongoose from "mongoose";
import {
  User, Course, Lesson, Enrollment, Progress, CourseEnrollmentRequest,
  Pilgrimage, BookingTax, PilgrimageBooking, TripAccess,
  UpcomingClass, Blog, VideoBlog, ImageGallery, VideoGallery,
  Preacher, Benefit, Testimonial, HeroBanner, PageSection, AboutPageSection,
  Page, LegalPage, Subscriber, ContactMessage, Notification,
  ChatRoom, ChatMessage, ActivityLog, LoginSession,
  SiteSetting, FooterSetting, ExamQuestionBank, ExamQuestion, ExamPaper,
  ExamAssignment, ExamAttempt, ExamResponse, Comment, Note, CourseContent,
  TrafficLog, FileUpload, UserActivity, StudentAnalytics, TeacherAnalytics,
  TeacherAssignmentHistory, TeacherPerformance, TeacherRating, CourseProgress,
  ContentProgress, Question, QuizAttempt, WatchLog, OtpCode, PasswordResetRequest
} from "./models.js";

/* ---------- helpers ---------- */

const slugify = (s) =>
  String(s).toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");

/* Dates relative to today, so the demo never looks stale. */
const DAY = 86400000;
const daysOut = (n) => new Date(Date.now() + n * DAY);
const daysAgo = (n) => new Date(Date.now() - n * DAY);

/* Next N Sundays, so the classes always read as upcoming. */
const nextSundays = (count) => {
  const out = [];
  const d = new Date();
  d.setHours(18, 0, 0, 0);
  do { d.setDate(d.getDate() + 1); } while (d.getDay() !== 0);
  for (let i = 0; i < count; i += 1) {
    out.push(new Date(d));
    d.setDate(d.getDate() + 7);
  }
  return out;
};

const IMG = {
  gita: "/uploads/courses/1782480668022-bhagavad-gita-as-it-is-1.jpg",
  bhagavatam: "/uploads/courses/1782480830829-bhagavatam.jpg",
  guru: "/uploads/courses/1782480993426-guru_disciple.jpg",
  disciple: "/uploads/courses/1783106399937-isckon-disicple.jpg",
  gita2: "/uploads/courses/1783173823917-bhagavad-gita-as-it-is-1.jpg",
  bhagavatam2: "/uploads/courses/1783173863993-bhagavatam.jpg",
  teacher1: "/uploads/visionaries/1782481873009-mmp.jpg",
  teacher2: "/uploads/visionaries/1782482382041-rvp.jpg",
  teacher3: "/uploads/visionaries/1782483797539-krishnachaitanyadas.jpg",
  teacher4: "/uploads/visionaries/1782483929816-kcd.jpg",
  teacher5: "/uploads/visionaries/1782485331212-kcd_katha.jpg",
  teacher6: "/uploads/visionaries/1783174302832-rvp.jpg",
  class1: "/uploads/upcoming-classes/1783225094020-ssrr.jpg",
  class2: "/uploads/upcoming-classes/1783225204239-b71ac1f34f7fd12d6a95ffd66701548b.jpg",
  class3: "/uploads/upcoming-classes/1778939109159-group-32.png",
  ekadashi: "/uploads/upcoming-classes/yogini-ekadashi-2026.png",
  prabhupada: "/uploads/about-sections/1783225751333-srila-prabhupada-103.jpg",
  prabhupada2: "/uploads/about-sections/1783225864079-sppic.jpg",
  vyasasana: "/uploads/about-sections/1783225944213-spvyasasana.jpeg",
  chaitanya: "/uploads/about-sections/1783226155086-lordchaitanya.jpg",
  temple: "/uploads/about-sections/1783226348536-ssrrlv.jpg",
  goloka: "/uploads/about-sections/1783226776191-golokawelcome.jpg",
  banner1: "/uploads/banners/1779112807602-59ba59eb-1050-4075-9da9-d8f0decc7f08.jpg",
  banner2: "/uploads/banners/1780514532582-9595f300-d243-4e58-a290-6725eb11dc34.jpg",
  tripHero: "/uploads/trips/pilgrimage-hero.webp",
  tripKashi: "/uploads/trips/pilgrimage-kashi-hero.webp",
  postcard1: "/uploads/trips/pilgrimage-kashi-postcard-01.webp",
  postcard2: "/uploads/trips/pilgrimage-kashi-postcard-02.webp",
  skyline: "/uploads/trips/temple-skyline.webp"
};

const log = (label, n) => console.log(`  ${String(n).padStart(3)} ${label}`);

/* ============================================================ */

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/iskcon-lms", {
    serverSelectionTimeoutMS: 8000
  });
  console.log(`\nSeeding demo data into: ${mongoose.connection.name}\n`);

  /* ---------- clear ---------- */
  const models = [
    User, Course, Lesson, Enrollment, Progress, CourseEnrollmentRequest,
    Pilgrimage, BookingTax, PilgrimageBooking, TripAccess, UpcomingClass,
    Blog, VideoBlog, ImageGallery, VideoGallery, Preacher, Benefit, Testimonial,
    HeroBanner, PageSection, AboutPageSection, Page, LegalPage, Subscriber,
    ContactMessage, Notification, ChatRoom, ChatMessage, ActivityLog,
    LoginSession, SiteSetting, FooterSetting, ExamQuestionBank, ExamQuestion,
    ExamPaper, ExamAssignment, ExamAttempt, ExamResponse, Comment, Note,
    CourseContent, TrafficLog, FileUpload, UserActivity, StudentAnalytics,
    TeacherAnalytics, TeacherAssignmentHistory, TeacherPerformance, TeacherRating,
    CourseProgress, ContentProgress, Question, QuizAttempt, WatchLog, OtpCode,
    PasswordResetRequest
  ];
  await Promise.all(models.map((M) => M.deleteMany({})));
  console.log("Cleared existing collections.\n");

  /* ---------- people ---------- */
  console.log("People");

  const admin = await User.create({
    name: "ISKCON Self-Excellence Admin",
    email: "admin@iskconselfexcellence.online",
    password: "Admin@2026",
    phone: "+91 22 2620 6860",
    role: "main_admin",
    status: "active",
    emailVerified: true
  });

  const staff = await Promise.all([
    ["Gopal Das", "gopal@iskconselfexcellence.online", "admin", []],
    ["Radhika Devi", "radhika@iskconselfexcellence.online", "manager",
      ["courses", "upcoming-classes", "blogs", "trips", "trip-bookings"]],
    ["Nitai Das", "nitai@iskconselfexcellence.online", "editor",
      ["blogs", "video-blogs", "media"]],
    ["Arjun Mehta", "arjun@iskconselfexcellence.online", "viewer",
      ["dashboard", "reports", "activity-log"]]
  ].map(([name, email, role, sections]) =>
    User.create({
      name, email, password: "Staff@2026", role, status: "active", emailVerified: true,
      managedBy: admin._id,
      sectionAccess: sections.map((section) => ({
        section,
        view: true,
        create: role === "manager" || role === "editor",
        edit: role === "manager" || role === "editor",
        canDelete: role === "manager"
      }))
    })
  ));
  log("staff accounts (admin, manager, editor, viewer)", staff.length + 1);

  const teachers = await Promise.all([
    ["HG Radheshyam Das", "radheshyam@iskconselfexcellence.online", IMG.teacher1,
      "Senior Gita Mentor", "28 years"],
    ["HG Madhava Mohan Das", "madhava@iskconselfexcellence.online", IMG.teacher2,
      "Bhagavatam Teacher", "16 years"],
    ["HG Krishna Chaitanya Das", "chaitanya@iskconselfexcellence.online", IMG.teacher3,
      "Youth Preacher", "11 years"]
  ].map(([name, email, profileImage, bio, experience]) =>
    User.create({
      name, email, password: "Teacher@2026", role: "teacher", profileImage,
      bio, expertise: [bio], status: "active", emailVerified: true,
      permissions: {
        canCreateCourse: true, canEditCourse: true, canCreateLesson: true,
        canEditLesson: true, canViewStudents: true, canViewAnalytics: true,
        canReplyToComments: true, canReplyToChats: true,
        canViewStudentProgress: true, canSendReminders: true,
        canMarkDoubtsResolved: true
      }
    })
  ));
  log("teachers", teachers.length);

  const studentSeed = [
    ["Aarav Mehta", "aarav@example.com"],
    ["Kavya Shah", "kavya@example.com"],
    ["Rohan Iyer", "rohan@example.com"],
    ["Ananya Rao", "ananya@example.com"],
    ["Vivek Nair", "vivek@example.com"],
    ["Meera Joshi", "meera@example.com"]
  ];
  const students = await Promise.all(studentSeed.map(([name, email], i) =>
    User.create({
      name, email, password: "Student@2026", role: "student",
      phone: `+91 98${String(200000000 + i * 111111).slice(0, 8)}`,
      status: "active", emailVerified: true, createdAt: daysAgo(90 - i * 10)
    })
  ));
  log("students", students.length);

  /* ---------- site configuration ---------- */
  console.log("\nSite configuration");

  await SiteSetting.create({
    singletonKey: "site",
    siteName: "ISKCON Juhu Self-Excellence",
    logo: "/logo-black-header.png",
    headerLinks: [
      ["Home", "/"], ["About", "/about"], ["Courses", "/courses"], ["Trips", "/trips"],
      ["Visionaries", "/visionaries"], ["Blogs", "/blogs"], ["Media", "/gallery/images"],
      ["Contact", "/contact"]
    ].map(([label, url], i) => ({ label, url, sortOrder: i + 1, status: "active" })),
    socialLinks: {
      facebook: "https://facebook.com/iskconjuhu",
      instagram: "https://instagram.com/iskconjuhu",
      youtube: "https://youtube.com/@iskconjuhu"
    },
    defaultSeoTitle: "ISKCON Juhu Self-Excellence",
    defaultSeoDescription:
      "Spiritual education, guided pilgrimages and weekly Sunday programmes at ISKCON Juhu, Mumbai.",
    aboutStats: { courses: "6+", teachers: "3+", lessons: "18+", sundayClasses: "Every Week" }
  });

  await FooterSetting.create({
    singletonKey: "footer",
    logo: "/logo-black-header.png",
    description:
      "ISKCON Juhu Self-Excellence helps students grow through scripture, discipline, community and practical spiritual learning.",
    columns: [
      { title: "Quick Links", links: [
        { label: "Home", url: "/" }, { label: "About", url: "/about" },
        { label: "Courses", url: "/courses" }, { label: "Trips", url: "/trips" },
        { label: "Contact", url: "/contact" }] },
      { title: "Learning", links: [
        { label: "Visionaries", url: "/visionaries" }, { label: "Blogs", url: "/blogs" },
        { label: "Video Blogs", url: "/video-blogs" },
        { label: "Image Gallery", url: "/gallery/images" }] },
      { title: "Legal", links: [
        { label: "Privacy Policy", url: "/privacy-policy" },
        { label: "Terms and Conditions", url: "/terms-and-conditions" },
        { label: "Sitemap", url: "/sitemap" }] }
    ],
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
    copyrightText: "ISKCON Juhu Self-Excellence. All Rights Reserved.",
    copyrightYear: new Date().getFullYear(),
    newsletterEnabled: true
  });
  log("site settings and footer", 2);

  await PageSection.insertMany([
    ["upcoming_classes", "Upcoming Classes On Sunday", "Timing 6 PM to 9 PM"],
    ["courses", "Explore All the Courses", "Designed by experienced devotees"],
    ["about", "Empowering Students to Achieve Spiritual & Personal Excellence",
      "Welcome to ISKCON Juhu Self-Excellence"],
    ["video_intro", "Experience a Class", "A short look at a Sunday evening"],
    ["preachers", "Our Qualified Teachers", "Learn from senior devotees"],
    ["benefits", "Benefits of Self-Excellence Classes", "What students take away"],
    ["blogs", "Latest Blogs", "Reflections on spiritual learning"],
    ["video_blogs", "Latest Videos", "Classes, kirtans and short reflections from ISKCON Juhu."],
    ["media_highlight", "Photo & Video Gallery", "Moments from our classes and pilgrimages"],
    ["testimonials", "Student Reflections", "Real stories. Real transformation."],
    ["newsletter", "Stay Connected on Your Spiritual Journey",
      "Get updates on classes, events, blogs and pilgrimages."]
  ].map(([sectionKey, sectionTitle, sectionSubtitle], i) => ({
    pageName: "home", sectionKey, sectionTitle, sectionSubtitle,
    sortOrder: i + 1, status: "active"
  })));
  log("homepage sections", 11);

  await AboutPageSection.insertMany([
    { pageName: "about", sectionTitle: "Our Mission",
      sectionSubtitle: "Spiritual education for everyday excellence",
      description:
        "To empower students with timeless Vedic wisdom, a devotional support system, and practical tools for disciplined, joyful living.",
      image: IMG.prabhupada, sortOrder: 1, status: "active" },
    { pageName: "about", sectionTitle: "Our Vision",
      sectionSubtitle: "Strong minds, soft hearts, purposeful lives",
      description:
        "A generation of students who carry both competence and character — capable in their professions and steady in their spiritual practice.",
      image: IMG.chaitanya, sortOrder: 2, status: "active" },
    { pageName: "about", sectionTitle: "Our Founder-Acharya",
      sectionSubtitle: "His Divine Grace A.C. Bhaktivedanta Swami Prabhupada",
      description:
        "Srila Prabhupada brought the teachings of Krishna consciousness to the world in 1965, founding ISKCON and translating the Bhagavad-gita and Srimad-Bhagavatam into English.",
      image: IMG.vyasasana, sortOrder: 3, status: "active" }
  ]);
  log("about sections", 3);

  await HeroBanner.insertMany([
    { title: "Begin Your Devotional Journey",
      subtitle: "Discover timeless wisdom, transform your life",
      buttonText: "Explore Courses", buttonLink: "/courses",
      desktopImage: IMG.banner1, order: 1, isActive: true },
    { title: "Sacred Journeys Through the Year",
      subtitle: "Guided pilgrimages with senior devotees",
      buttonText: "View Trips", buttonLink: "/trips",
      desktopImage: IMG.banner2, order: 2, isActive: true }
  ]);
  log("hero banners", 2);

  await Page.create({
    title: "About Us", slug: "about", pageName: "about",
    excerpt: "A spiritual education and personal excellence programme for students.",
    content: "ISKCON Juhu Self-Excellence runs weekly classes, structured courses and guided pilgrimages for students and working professionals in Mumbai.",
    status: "active"
  });

  await LegalPage.insertMany([
    { slug: "privacy-policy", title: "Privacy Policy",
      content: "We collect only the information needed to deliver courses and confirm bookings: your name, contact details, and the payment receipt you upload. Payment receipts are visible only to our office staff and are never shared. We do not sell or pass your data to third parties.",
      status: "active" },
    { slug: "terms-and-conditions", title: "Terms and Conditions",
      content: "Course enrolment and trip bookings are confirmed once our team verifies your payment, usually within two working days. Trip cancellations more than 21 days before departure are refunded in full less transaction charges.",
      status: "active" }
  ]);
  log("pages and legal pages", 3);

  /* ---------- visionaries ---------- */
  const preachers = await Preacher.insertMany([
    ["HG Radheshyam Das", "Senior Gita Mentor", IMG.teacher1, "Founder", "28 years",
      "Has taught the Bhagavad-gita to students in Mumbai for nearly three decades."],
    ["HG Madhava Mohan Das", "Bhagavatam Teacher", IMG.teacher2, "Team Member", "16 years",
      "Leads the Srimad-Bhagavatam study circle and the Thursday morning class."],
    ["HG Krishna Chaitanya Das", "Youth Preacher", IMG.teacher3, "Team Member", "11 years",
      "Works with college students and leads the youth retreats to Mayapur."],
    ["HG Govind Priya Das", "Life Coach", IMG.teacher4, "Team Member", "9 years",
      "Focuses on applying devotional principles to study, work and family life."],
    ["HG Shyam Sundar Das", "Kirtan Leader", IMG.teacher5, "Team Member", "14 years",
      "Leads kirtan at the Sunday programme and trains new singers."],
    ["HG Nitai Gaura Das", "Temple Coordinator", IMG.teacher6, "Director", "21 years",
      "Coordinates the Sunday programme, pilgrimages and devotee care."]
  ].map(([name, designation, image, type, experience, shortBio], i) => ({
    name, slug: slugify(name), designation, image, type, experience, shortBio,
    fullBio: `${shortBio} ${name} is available to students through the doubt box and the weekly support sessions.`,
    specialization: [designation],
    status: "active", showOnHomepage: true, sortOrder: i + 1
  })));
  log("visionaries", preachers.length);

  console.log("\nLearning");

  /* ---------- courses and lessons ---------- */
  const courseSeed = [
    ["Bhagavad-gita Foundations", IMG.gita, "Scripture", "Beginner", 0, "free",
      "The Gita in eighteen sessions, read as a practical manual rather than a historical text.",
      teachers[0]],
    ["Srimad-Bhagavatam Study Circle", IMG.bhagavatam, "Scripture", "Intermediate", 0, "free",
      "A slow, careful reading of the First Canto with discussion each week.",
      teachers[1]],
    ["The Guru-Disciple Relationship", IMG.guru, "Philosophy", "Intermediate", 2500, "paid",
      "What guidance means in practice, and how the tradition understands it.",
      teachers[0]],
    ["Japa and Daily Sadhana", IMG.disciple, "Practice", "Beginner", 0, "free",
      "Building a chanting practice that survives a working week.",
      teachers[2]],
    ["Self-Excellence for Students", IMG.gita2, "Personal Growth", "Beginner", 1500, "paid",
      "Study habits, focus and character, drawn from Vedic principles.",
      teachers[2]],
    ["Vaishnava Etiquette and Culture", IMG.bhagavatam2, "Culture", "Beginner", 0, "verification",
      "How devotees relate to one another, and why it matters.",
      teachers[1]]
  ];

  const courses = [];
  for (let i = 0; i < courseSeed.length; i += 1) {
    const [title, thumbnail, category, level, price, enrolType, shortDescription, teacher] = courseSeed[i];
    const course = await Course.create({
      title, slug: slugify(title), thumbnail, bannerImage: thumbnail,
      shortDescription,
      description: `${shortDescription}\n\nSessions are recorded, so you can catch up if you miss a week. Each lesson has a comment box where questions reach the teacher directly, and notes you take are saved against the moment in the video where you took them.`,
      category, level, teacher: teacher._id, primaryTeacherId: teacher._id,
      duration: `${3 + i} weeks`,
      priceType: price > 0 ? "Paid" : "Free", price, isFree: price === 0,
      enrollmentType: [enrolType],
      verificationInstructions: enrolType === "verification"
        ? "Please upload a recommendation letter from your local temple or a senior devotee."
        : undefined,
      requiredDocumentName: enrolType === "verification" ? "Recommendation letter" : undefined,
      allowedFileTypes: enrolType === "verification" ? [".pdf", ".jpg", ".png"] : undefined,
      maxFileSize: 5,
      certificateEnabled: true, requiredWatchPercentage: 80,
      featured: i < 3, showOnHomepage: true, status: "published", order: i + 1,
      whatYouWillLearn: [
        "Read the text closely and apply it to daily decisions",
        "Build a practice you can keep through a busy week",
        "Ask questions directly of a senior devotee"
      ],
      createdBy: admin._id
    });
    courses.push(course);

    const lessonTitles = [
      "Introduction and how to study this course",
      "The core teaching, read slowly",
      "Applying it this week"
    ];
    for (let L = 0; L < lessonTitles.length; L += 1) {
      await Lesson.create({
        course: course._id, title: lessonTitles[L], slug: slugify(`${title}-${lessonTitles[L]}`),
        description: `Session ${L + 1} of ${title}.`,
        videoType: "youtube", youtubeUrl: "https://youtu.be/00s75c77QXA",
        thumbnail, duration: `${18 + L * 6} min`, order: L + 1, sortOrder: L + 1,
        isPreview: L === 0, status: "active", publishStatus: "published",
        commentsEnabled: true, notesEnabled: true, createdBy: admin._id
      });
    }
  }
  log("courses (each with 3 lessons)", courses.length);

  /* ---------- enrolments and progress ---------- */
  let enrolCount = 0;
  let progressCount = 0;
  for (let i = 0; i < students.length; i += 1) {
    const picks = [courses[i % courses.length], courses[(i + 2) % courses.length]];
    for (const course of picks) {
      await Enrollment.create({
        student: students[i]._id, course: course._id,
        status: "active", enrolledAt: daysAgo(60 - i * 7)
      });
      enrolCount += 1;

      const lessons = await Lesson.find({ course: course._id }).sort({ order: 1 }).lean();
      const done = (i % 3) + 1;
      for (let L = 0; L < lessons.length; L += 1) {
        const complete = L < done;
        await Progress.create({
          student: students[i]._id, course: course._id, lesson: lessons[L]._id,
          isCompleted: complete, status: complete ? "completed" : L === done ? "in_progress" : "not_started",
          watchPercent: complete ? 100 : L === done ? 45 : 0,
          watchSeconds: complete ? 1080 : L === done ? 480 : 0,
          maxWatchedSeconds: complete ? 1080 : L === done ? 480 : 0,
          completedAt: complete ? daysAgo(30 - L * 3) : undefined,
          lastWatchedAt: daysAgo(i + L)
        });
        progressCount += 1;
      }
    }
  }
  log("enrolments", enrolCount);
  log("lesson progress records", progressCount);

  /* ---------- enrolment requests at each status ---------- */
  const paidCourse = courses.find((c) => c.price > 0);
  await CourseEnrollmentRequest.insertMany([
    { student: students[3]._id, course: paidCourse._id, fullName: students[3].name,
      email: students[3].email, phone: "+91 98200 11111",
      paymentPhotoUrl: "/uploads/payment-receipts/demo-receipt.png",
      status: "pending", submittedAt: daysAgo(1) },
    { student: students[4]._id, course: paidCourse._id, fullName: students[4].name,
      email: students[4].email, phone: "+91 98200 22222",
      paymentPhotoUrl: "/uploads/payment-receipts/demo-receipt.png",
      status: "approved", reviewedBy: admin._id, reviewedAt: daysAgo(5), submittedAt: daysAgo(7) },
    { student: students[5]._id, course: paidCourse._id, fullName: students[5].name,
      email: students[5].email, phone: "+91 98200 33333",
      paymentPhotoUrl: "/uploads/payment-receipts/demo-receipt.png",
      status: "rejected", rejectionReason: "The payment reference did not match our records. Please re-send the receipt.",
      reviewedBy: admin._id, reviewedAt: daysAgo(2), submittedAt: daysAgo(3) }
  ]);
  log("enrolment requests (pending / approved / rejected)", 3);

  /* ---------- exams ---------- */
  const bank = await ExamQuestionBank.create({
    title: "Bhagavad-gita Foundations \u2014 Question Bank",
    description: "Questions covering chapters one through six.",
    totalMcqsAvailable: 5, totalObjectiveAvailable: 1,
    isActive: true, createdBy: admin._id
  });

  const mcqs = await ExamQuestion.insertMany([
    ["On which battlefield is the Bhagavad-gita spoken?",
      ["Kurukshetra", "Vrindavan", "Mayapur", "Dwarka"], 0],
    ["Who speaks the Bhagavad-gita to Arjuna?",
      ["Krishna", "Vyasa", "Sanjaya", "Dhritarashtra"], 0],
    ["How many chapters does the Bhagavad-gita contain?",
      ["12", "18", "24", "10"], 1],
    ["What does 'yoga' mean as it is used in the Gita?",
      ["Physical exercise", "Connection with the Supreme", "Meditation alone", "Giving up all work"], 1],
    ["Which chapter deals most directly with the eternal nature of the soul?",
      ["Chapter 1", "Chapter 2", "Chapter 9", "Chapter 18"], 1]
  ].map(([questionText, options, correct]) => ({
    questionBank: bank._id, type: "MCQ", questionText, marks: 2, difficulty: "easy",
    options: options.map((text, n) => ({ text, isCorrect: n === correct, order: n + 1 }))
  })));

  const written = await ExamQuestion.create({
    questionBank: bank._id, type: "OBJECTIVE",
    questionText: "In your own words, explain what Krishna means by performing work without attachment to its result.",
    marks: 5, difficulty: "medium",
    expectedKeywords: ["duty", "detachment", "result", "offering", "equanimity"],
    fullModelAnswer: "Work is to be done because it is one's duty, with the result offered rather than clung to. The action is still performed carefully; what changes is the expectation attached to its outcome.",
    autoEvaluate: false
  });

  const paper = await ExamPaper.create({
    title: "Bhagavad-gita Foundations \u2014 Assessment",
    description: "A short assessment covering the first six chapters.",
    questionBank: bank._id,
    durationMinutes: 30, numMcqsToPick: 5, numObjectiveToPick: 1,
    totalMarks: 15, passingMarks: 9,
    instructions: "Thirty minutes. Answer every question. The written answer is marked by a teacher, so the result may take a day.",
    isPublished: true, createdBy: admin._id
  });

  const firstLesson = await Lesson.findOne({ course: courses[0]._id }).sort({ order: 1 });
  const assignment = await ExamAssignment.create({
    exam: paper._id, course: courses[0]._id, lesson: firstLesson._id,
    startDate: daysAgo(14), endDate: daysOut(14), maxAttempts: 2, isActive: true
  });

  await ExamAttempt.insertMany([
    { exam: paper._id, user: students[0]._id, assignment: assignment._id,
      score: 13, totalMarks: 15, status: "passed",
      selectedQuestions: [...mcqs.map((q) => q._id), written._id],
      startedAt: daysAgo(8), submittedAt: daysAgo(8) },
    { exam: paper._id, user: students[1]._id, assignment: assignment._id,
      score: 7, totalMarks: 15, status: "failed",
      selectedQuestions: [...mcqs.map((q) => q._id), written._id],
      startedAt: daysAgo(6), submittedAt: daysAgo(6) },
    { exam: paper._id, user: students[2]._id, assignment: assignment._id,
      totalMarks: 15, status: "in_progress",
      selectedQuestions: [...mcqs.map((q) => q._id), written._id],
      startedAt: daysAgo(1) }
  ]);
  log("exam bank, questions, paper, assignment, attempts", mcqs.length + 6);

  console.log("\nPilgrimages");

  /* ---------- booking taxes ---------- */
  await BookingTax.insertMany([
    { label: "GST", type: "percent", value: 5, appliesTo: "booking",
      note: "Goods & Services Tax on tour packages", status: "active", sortOrder: 1 },
    { label: "Travel Insurance", type: "flat", value: 350, appliesTo: "person",
      note: "Per traveller, covers the duration of the journey", status: "active", sortOrder: 2 }
  ]);
  log("booking taxes", 2);

  /* ---------- trips ---------- */
  const tripSeed = [
    {
      title: "5-Day Sacred Journey to Vrindavana",
      badge: "FEATURED PILGRIMAGE", image: IMG.tripHero,
      destination: "Vrindavan, Uttar Pradesh", tripType: "Spiritual Pilgrimage",
      durationLabel: "5 Days / 4 Nights", days: 5, nights: 4, pricePerPerson: 18500,
      maxTravellers: 20, startOffset: 38, ageGroup: "18+",
      shortDescription: "A meaningful journey through the sacred temples, ghats and devotional culture of Vrindavan, guided by senior devotees.",
      description: "Vrindavan is where Krishna spent his childhood, and walking its lanes is unlike reading about them. Over five days you will visit the temples that have shaped Gaudiya Vaishnava practice for five centuries, join morning kirtan on the banks of the Yamuna, and sit with senior devotees for guided sessions each evening.\n\nThis journey is designed for students and working professionals who want more than sightseeing. Mornings are devotional, afternoons are for guided exploration and reflection, and evenings close with aarti and a discussion session.\n\nYou do not need prior experience of pilgrimage, and you do not need to be a practising devotee. You need curiosity and a willingness to keep early hours.",
      route: "ISKCON Juhu → Vrindavana → ISKCON Juhu",
      routeDetail: "Mumbai → Vrindavana → Mumbai",
      visitDetail: "ISKCON Vrindavan, Banke Bihari, Prem Mandir",
      guideDetail: "Senior Devotees",
      departurePoint: "ISKCON Juhu, Mumbai",
      meetingPoint: "ISKCON Juhu main gate, 5:30 AM",
      itinerary: [
        ["Departure & Arrival", "Travel from Mumbai and settle into Vrindavan.",
          "Depart from ISKCON Juhu at 5:30 AM.", "Arrive in Vrindavan, check in and rest.",
          "Orientation session and first temple darshan."],
        ["The Temple Heart of Vrindavan", "A full day among the temples that define the town.",
          "Mangala aarti at ISKCON Vrindavan, then breakfast prasadam.",
          "Banke Bihari Temple and the surrounding lanes.",
          "Prem Mandir illumination and evening kirtan."],
        ["Yamuna & Reflection", "A quieter day by the river, with time to absorb.",
          "Sunrise at Keshi Ghat and a guided walk along the Yamuna.",
          "Radha Raman Temple and free time for personal reflection.",
          "Guided discussion on practice in daily life."],
        ["Govardhan", "A day trip to Govardhan Hill.",
          "Travel to Govardhan and begin the parikrama.",
          "Kusum Sarovar and Radha Kund.",
          "Return to Vrindavan for aarti and closing reflections."],
        ["Closing & Return", "Final darshan and the journey home.",
          "Final temple darshan and group photograph.",
          "Depart for Mumbai.", "Arrive at ISKCON Juhu."]
      ],
      inclusions: ["Accommodation for 4 nights (twin sharing)", "Daily breakfast and prasadam",
        "Return transport from ISKCON Juhu", "All local transportation",
        "Temple visits and entry where applicable",
        "Guided evening sessions with senior devotees", "Dedicated trip coordinator throughout"],
      exclusions: ["Personal shopping and souvenirs", "Personal expenses and tips",
        "Travel insurance", "Optional activities not listed in the itinerary",
        "Anything not specifically mentioned under inclusions"],
      whoFor: ["Students", "Young Professionals", "Devotees", "Families", "First-time Pilgrims"],
      importantInfo: "Reporting time is 5:30 AM at the ISKCON Juhu main gate. Please carry a government photo ID — it is required at accommodation check-in.\n\nModest dress is expected at all temples: shoulders and knees covered. Leather items are not permitted inside several temples.\n\nOne suitcase and one small day bag per traveller. Accommodation is twin-sharing unless arranged otherwise.\n\nCancellations more than 21 days before departure are refunded in full less transaction charges.",
      faqs: [
        ["Is transportation included?", "Yes. Return transport from ISKCON Juhu and all local transportation during the trip are included."],
        ["What should I bring?", "Modest clothing covering shoulders and knees, comfortable footwear that is easy to remove, a government photo ID, any personal medication, and a reusable water bottle."],
        ["Are meals included?", "Daily breakfast and prasadam are included. Other meals are not, so you can choose according to your own preference."],
        ["Can I cancel my booking?", "Cancellations more than 21 days before departure are refunded in full less transaction charges."],
        ["Can I book for someone else?", "Yes. Add each traveller's name and age in the booking form."],
        ["What happens after I pay?", "Upload your payment screenshot with the booking. Our team verifies it, usually within two working days."]
      ],
      gallery: [IMG.postcard1, IMG.postcard2, IMG.tripKashi, IMG.skyline]
    },
    {
      title: "3-Day Mayapur Youth Retreat",
      badge: "YOUTH JOURNEY", image: IMG.tripKashi,
      destination: "Mayapur, West Bengal", tripType: "Youth Retreat",
      durationLabel: "3 Days / 2 Nights", days: 3, nights: 2, pricePerPerson: 9500,
      maxTravellers: 30, startOffset: 60, ageGroup: "18-30",
      shortDescription: "A short, intense retreat for students and young professionals at ISKCON's world headquarters on the banks of the Ganga.",
      description: "Mayapur is where Chaitanya Mahaprabhu appeared, and where ISKCON keeps its world headquarters. For three days you will live the daily rhythm of a temple community: up before dawn for mangala aarti, sessions through the day with youth preachers, and evenings of kirtan that tend to run longer than scheduled.\n\nThis retreat is built for people in their twenties who are curious but busy. It is deliberately short and deliberately full. Expect early mornings, simple accommodation, long conversations, and very little downtime.",
      route: "ISKCON Juhu → Mayapur → ISKCON Juhu",
      routeDetail: "Mumbai → Kolkata → Mayapur",
      visitDetail: "Chandrodaya Mandir, Yogapith, Samadhi Mandir",
      guideDetail: "Youth Preachers",
      departurePoint: "ISKCON Juhu, Mumbai",
      meetingPoint: "ISKCON Juhu main gate, 4:00 AM",
      itinerary: [
        ["Mumbai to Mayapur", "A long travel day that ends with your first darshan.",
          "Depart ISKCON Juhu at 4:00 AM for the Kolkata flight.",
          "Road transfer to Mayapur and dormitory check-in.",
          "Sandhya aarti at the Chandrodaya Mandir."],
        ["A Full Day in Mayapur", "The temple day, start to finish.",
          "Mangala aarti at 4:00 AM, then Yogapith and the Samadhi Mandir.",
          "Sessions with youth preachers and time on the Ganga ghats.",
          "Kirtan and an open discussion that usually runs late."],
        ["Closing & Return", "Final darshan and the journey home.",
          "Mangala aarti, final darshan and group photograph.",
          "Road transfer to Kolkata and the flight to Mumbai.",
          "Arrive at ISKCON Juhu."]
      ],
      inclusions: ["Return flights Mumbai to Kolkata", "Dormitory accommodation for 2 nights",
        "All prasadam during the retreat", "Road transfer Kolkata to Mayapur and back",
        "All temple visits and sessions", "Youth preacher accompanying the group"],
      exclusions: ["Private room upgrade", "Personal shopping and expenses", "Travel insurance",
        "Anything not specifically mentioned under inclusions"],
      whoFor: ["Students", "Young Professionals", "First-time Pilgrims", "College Groups"],
      importantInfo: "Reporting time is 4:00 AM at the ISKCON Juhu main gate. The flight to Kolkata is early and the group will not wait.\n\nCarry a government photo ID, required for the flight and at check-in.\n\nAccommodation is dormitory style, separated by gender. Mornings start at 4:00 AM for mangala aarti — this is the core of the retreat rather than an optional extra.",
      faqs: [
        ["Are flights included?", "Yes. Return flights between Mumbai and Kolkata are included, along with the road transfer to Mayapur and back."],
        ["What is the accommodation like?", "Dormitory style, separated by gender, within the temple complex. Clean and simple rather than comfortable."],
        ["Do I really have to be up at 4 AM?", "Yes. Mangala aarti is the heart of the retreat. If very early mornings are not workable, the Vrindavan journey keeps a gentler schedule."],
        ["I have never been to a temple before. Is that a problem?", "Not at all. Several people on every retreat are attending their first."],
        ["Can my college group book together?", "Yes. Add everyone as travellers on one booking, or write to the youth office if you are more than ten people."]
      ],
      gallery: [IMG.postcard2, IMG.skyline, IMG.postcard1]
    },
    {
      title: "2-Day Pandharpur Pilgrimage",
      badge: "WEEKEND JOURNEY", image: IMG.skyline,
      destination: "Pandharpur, Maharashtra", tripType: "Temple Tour",
      durationLabel: "2 Days / 1 Night", days: 2, nights: 1, pricePerPerson: 4500,
      maxTravellers: 40, startOffset: 24, ageGroup: "All ages",
      shortDescription: "A weekend journey to the temple of Vitthal on the banks of the Chandrabhaga, within reach of a Mumbai weekend.",
      description: "Pandharpur is the heart of the Warkari tradition, where pilgrims have walked to see Vitthal for more than seven centuries. This is the shortest of our journeys — leave Saturday morning, back Sunday night — and the easiest for families or anyone who cannot take leave from work.\n\nThe pace is gentle. There is darshan, a walk along the Chandrabhaga, and an evening of kirtan with local Warkari singers.",
      route: "ISKCON Juhu → Pandharpur → ISKCON Juhu",
      routeDetail: "Mumbai → Pandharpur → Mumbai",
      visitDetail: "Vitthal Rukmini Temple, Chandrabhaga Ghat",
      guideDetail: "Temple Coordinator",
      departurePoint: "ISKCON Juhu, Mumbai",
      meetingPoint: "ISKCON Juhu main gate, 6:00 AM Saturday",
      itinerary: [
        ["Mumbai to Pandharpur", "Travel and first darshan.",
          "Depart ISKCON Juhu at 6:00 AM by coach.",
          "Arrive, check in and take prasadam.",
          "Vitthal Rukmini darshan and evening aarti."],
        ["Chandrabhaga & Return", "A morning by the river, then home.",
          "Sunrise walk along the Chandrabhaga ghats.",
          "Kirtan with local Warkari singers, then depart.",
          "Arrive at ISKCON Juhu by late evening."]
      ],
      inclusions: ["Return coach from ISKCON Juhu", "One night accommodation",
        "All prasadam", "Temple darshan arrangements", "Trip coordinator"],
      exclusions: ["Personal expenses", "Travel insurance", "Optional activities"],
      whoFor: ["Families", "Working Professionals", "First-time Pilgrims", "Senior Devotees"],
      importantInfo: "A coach journey of roughly eight hours each way. Please carry a government photo ID and any medication you need.\n\nThe temple can be crowded; the coordinator will brief the group on darshan arrangements on the way.",
      faqs: [
        ["How long is the coach journey?", "Roughly eight hours each way, with stops."],
        ["Is this suitable for older family members?", "Yes. The pace is gentle and there is no parikrama or long walking."],
        ["Are meals included?", "All prasadam during the journey is included."]
      ],
      gallery: [IMG.skyline, IMG.tripKashi]
    }
  ];

  const trips = [];
  for (let i = 0; i < tripSeed.length; i += 1) {
    const t = tripSeed[i];
    const trip = await Pilgrimage.create({
      title: t.title, slug: slugify(t.title), badge: t.badge, image: t.image,
      destination: t.destination, tripType: t.tripType, durationLabel: t.durationLabel,
      days: t.days, nights: t.nights, pricePerPerson: t.pricePerPerson,
      maxTravellers: t.maxTravellers, ageGroup: t.ageGroup,
      accommodation: "Included", transport: "Included",
      departurePoint: t.departurePoint, meetingPoint: t.meetingPoint,
      startDate: daysOut(t.startOffset), endDate: daysOut(t.startOffset + t.days - 1),
      bookingOpenDate: daysAgo(30), bookingCloseDate: daysOut(t.startOffset - 7),
      shortDescription: t.shortDescription, description: t.description,
      route: t.route, routeDetail: t.routeDetail,
      visitDetail: t.visitDetail, guideDetail: t.guideDetail,
      importantInfo: t.importantInfo, whoFor: t.whoFor,
      itinerary: t.itinerary.map(([title, description, morning, afternoon, evening], d) => ({
        dayNumber: d + 1, title, description, morning, afternoon, evening, sortOrder: d + 1
      })),
      inclusions: t.inclusions.map((title, n) => ({ title, sortOrder: n + 1 })),
      exclusions: t.exclusions.map((title, n) => ({ title, sortOrder: n + 1 })),
      faqs: t.faqs.map(([question, answer], n) => ({ question, answer, sortOrder: n + 1 })),
      gallery: t.gallery.map((imageUrl, n) => ({
        imageUrl, altText: `${t.destination} photograph ${n + 1}`, sortOrder: n + 1
      })),
      paymentInstructions: "Please add your booking reference in the payment remarks so we can match it quickly.",
      upiId: "iskconjuhu@okaxis",
      bankAccountName: "ISKCON Juhu", bankAccountNumber: "000011112222",
      bankIfsc: "SBIN0001234", bankName: "State Bank of India", bankBranch: "Juhu, Mumbai",
      paymentContactName: "Travel desk", paymentContactNumber: "+91 22 2620 6860",
      bookingEnabled: true, tripStatus: "published", status: "active",
      showOnHomepage: true, featured: i === 0, featuredOrder: i + 1, sortOrder: i + 1
    });
    trips.push(trip);
  }
  log("trips (full itinerary, gallery, FAQs, payment details)", trips.length);

  /* ---------- trip bookings at each status ---------- */
  const quote = (price, count) => {
    const subtotal = price * count;
    const breakdown = [
      { label: "GST", type: "percent", value: 5, appliesTo: "booking", amount: Math.round(subtotal * 0.05) },
      { label: "Travel Insurance", type: "flat", value: 350, appliesTo: "person", amount: 350 * count }
    ];
    const taxTotal = breakdown.reduce((s, b) => s + b.amount, 0);
    return { subtotal, taxBreakdown: breakdown, taxTotal, totalAmount: subtotal + taxTotal };
  };

  const bookingSeed = [
    [students[0], trips[0], [["Aarav Mehta", 28, "male"], ["Priya Mehta", 26, "female"]], "approved"],
    [students[1], trips[1], [["Kavya Shah", 24, "female"]], "payment_submitted"],
    [students[2], trips[0], [["Rohan Iyer", 31, "male"]], "rejected"],
    [students[3], trips[2], [["Ananya Rao", 29, "female"], ["Suresh Rao", 58, "male"], ["Lata Rao", 55, "female"]], "approved"]
  ];

  for (let i = 0; i < bookingSeed.length; i += 1) {
    const [student, trip, travellers, status] = bookingSeed[i];
    const totals = quote(trip.pricePerPerson, travellers.length);
    const booking = await PilgrimageBooking.create({
      user: student._id, pilgrimage: trip._id,
      bookingRef: `PJ-${Date.now().toString(36).toUpperCase()}-${String(i).padStart(2, "0")}${Math.random().toString(36).slice(2, 4).toUpperCase()}`,
      fullName: student.name, email: student.email, phone: student.phone || "+91 98200 00000",
      travellers: travellers.map(([name, age, gender]) => ({ name, age, gender })),
      travellerCount: travellers.length,
      pricePerPerson: trip.pricePerPerson, ...totals,
      paymentPhotoUrl: "/uploads/pilgrimage-payments/demo-receipt.png",
      paymentStatus: status === "approved" ? "verified" : status === "rejected" ? "failed" : "proof_submitted",
      status,
      rejectionReason: status === "rejected"
        ? "The payment screenshot was unclear. Please re-send a full-page screenshot showing the reference number."
        : undefined,
      reviewedBy: status === "payment_submitted" ? undefined : admin._id,
      reviewedAt: status === "payment_submitted" ? undefined : daysAgo(2),
      submittedAt: daysAgo(4 + i)
    });

    if (status === "approved") {
      await TripAccess.create({
        user: student._id, pilgrimage: trip._id, booking: booking._id,
        status: "active", grantedAt: daysAgo(2)
      });
    }
  }
  log("trip bookings (approved / awaiting / rejected) + access", bookingSeed.length);

  console.log("\nClasses and content");

  /* ---------- Sunday classes ---------- */
  const sundays = nextSundays(4);
  const classSeed = [
    ["Idol Worship or Divine Connection", IMG.class1, "HG Radheshyam Das", "ISKCON Juhu Auditorium",
      "A thoughtful discussion on deity worship and personal connection with Krishna."],
    ["Aakhir Kaun Hai Ye Jagannath?", IMG.class2, "HG Madhava Mohan Das", "ISKCON Juhu Temple Hall",
      "Discover the sweetness and history of Lord Jagannath in an engaging youth session."],
    ["Yogini Ekadashi", IMG.ekadashi, "HG Govind Priya Das", "ISKCON Juhu Seminar Room",
      "Learn the story, practice, and inner meaning of Yogini Ekadashi."],
    ["The Art of Daily Sadhana", IMG.class1, "HG Krishna Chaitanya Das", "ISKCON Juhu Auditorium",
      "Building a practice that survives a working week, with time for questions."]
  ];

  for (let i = 0; i < classSeed.length; i += 1) {
    const [title, image, speaker, venue, shortDescription] = classSeed[i];
    await UpcomingClass.create({
      title, slug: slugify(title), image, date: sundays[i], time: "6 PM to 9 PM",
      venue, speaker, shortDescription,
      fullDescription: `${shortDescription}\n\nThe evening is open to everyone, whether or not you have attended before. There is no charge, and prasadam is served to all who stay.`,
      whatToExpect: "The evening opens with kirtan — call and response chanting that anyone can join without knowing the words. You do not need to sing; many people simply sit and listen the first time.\n\nThe class that follows draws on scripture but is pitched at people living ordinary working lives. Expect roughly forty minutes of talk and twenty of questions, and the questions are genuinely welcome.\n\nWe close with prasadam, a full vegetarian meal served to everyone who stays. There is no charge and no expectation that you contribute.",
      schedule: [
        { time: "6:00 PM", activity: "Kirtan", detail: "Call and response chanting. No experience needed.", sortOrder: 1 },
        { time: "6:45 PM", activity: "Class", detail: "A talk drawn from scripture, pitched at working life.", sortOrder: 2 },
        { time: "7:30 PM", activity: "Questions", detail: "Open floor. Nothing is too basic to ask.", sortOrder: 3 },
        { time: "8:00 PM", activity: "Prasadam", detail: "A full vegetarian meal served to everyone.", sortOrder: 4 }
      ],
      highlights: [
        "A practical reading you can use the same week",
        "Kirtan you can join at any level, including not singing at all",
        "Time with senior devotees who answer questions directly",
        "Prasadam and a community that notices whether you came back"
      ].map((t, n) => ({ title: t, sortOrder: n + 1 })),
      whoFor: ["Students", "Working professionals", "Families", "First-time visitors"],
      notes: "Please arrive ten minutes early so you can settle before kirtan begins.\n\nModest dress is appreciated — shoulders and knees covered. Footwear is left at the entrance.\n\nThe hall is on the ground floor and is step-free. Tell us when you register if you need a chair rather than floor seating.\n\nChildren are welcome. There is space at the back for families who may need to step out.",
      registrationNote: "Registering helps us cook the right amount of prasadam. Walk-ins are still welcome.",
      seats: 120,
      gallery: [IMG.class1, IMG.class2, IMG.class3].map((imageUrl, n) => ({
        imageUrl, altText: `Sunday programme photograph ${n + 1}`, sortOrder: n + 1
      })),
      buttonText: "Register Now", status: "active", showOnHomepage: true, sortOrder: i + 1
    });
  }
  log("Sunday classes (running order, highlights, gallery)", classSeed.length);

  /* ---------- blogs ---------- */
  const blogSeed = [
    ["Why Students Need Spiritual Anchoring", "Youth", IMG.prabhupada,
      "Exam seasons pass. The habits you build around them do not."],
    ["Five Lessons from the Bhagavad-gita", "Wisdom", IMG.gita,
      "Not a summary of the text, but five things students keep returning to."],
    ["The Power of Satsang", "Community", IMG.temple,
      "Why who you sit with on a Sunday evening changes what you do on a Tuesday."],
    ["Starting a Japa Practice That Lasts", "Practice", IMG.disciple,
      "Most people begin with sixteen rounds and stop by Thursday. Start smaller."],
    ["What a Pilgrimage Actually Involves", "Pilgrimage", IMG.tripHero,
      "Early mornings, long walks, and a great deal of waiting. Here is the honest version."],
    ["Reading the Bhagavatam Slowly", "Scripture", IMG.bhagavatam,
      "The First Canto takes a year if you read it properly. That is the point."]
  ];
  await Blog.insertMany(blogSeed.map(([title, category, image, shortDescription], i) => ({
    title, slug: slugify(title), image, category, shortDescription,
    content: `${shortDescription}\n\nThis reflection comes out of conversations in the Sunday programme and the questions students send through the doubt box. It is written for people balancing study or work with a developing practice, not for scholars.\n\nIf something here raises a question, the comment box on any lesson reaches a teacher directly, and the Sunday class always keeps time for questions.`,
    author: teachers[i % teachers.length]._id,
    tags: [category, "Self-Excellence"],
    status: "published", featured: i < 2, showOnHomepage: true
  })));
  log("blogs", blogSeed.length);

  /* Distinct video ids on purpose: the poster is taken from the video
     when no thumbnail is uploaded, so sharing one id would give every
     card the same picture. */
  /* Real recordings from the temple's own YouTube channels, so the
     demo shows actual classes rather than stand-in clips. Durations are
     left blank on purpose: the card simply omits one rather than state
     a length nobody has checked. */
  const videoBlogSeed = [
    ["Srimad Bhagavatam Class 11.6.11", "Scripture", "HG Anuttama Prabhu", "", "z-OyKOYK3-g",
      "A verse-by-verse class on Srimad-Bhagavatam 11.6.11, recorded at ISKCON Juhu."],
    ["Never Give Up", "Kirtan", "HG Shukadev Prabhu", "", "JgzVj92MRNg",
      "Kirtan and a short message on persistence in practice, from the Self-Excellence youth programme."],
    ["Playing for the Highest Goal", "Kirtan", "HG Akshobhya Das", "", "qyJtitTfCh8",
      "On keeping the goal in view while living an ordinary working life."],
    ["Inviting Krishna Into Our Hearts", "Festivals", "HG Akshobhya Das", "", "Y26OyUgf-0s",
      "A Krishna Janmashtami kirtan and class from the Self-Excellence youth programme."],
    ["The Meaning Behind Krishna\u2019s Appearance", "Festivals", "HG Satya Madhav Prabhu", "", "8F1vOD_9hrg",
      "Why Krishna appears, and what Janmashtami is actually asking of us."]
  ];
  await VideoBlog.insertMany(videoBlogSeed.map(([title, category, speaker, duration, videoId, shortDescription], i) => ({
    title, slug: slugify(title),
    videoType: "youtube", videoUrl: `https://youtu.be/${videoId}`,
    category, speaker, duration, shortDescription,
    description: `${shortDescription}\n\nRecorded at ISKCON Juhu and free to watch. If something here raises a question, the Sunday class always keeps time for questions.`,
    tags: [category, "Self-Excellence"],
    status: "published", showOnHomepage: true,
    featured: i === 0, sortOrder: i + 1
  })));
  log("video blogs", videoBlogSeed.length);

  /* ---------- galleries ---------- */
  await ImageGallery.insertMany([
    IMG.temple, IMG.chaitanya, IMG.goloka, IMG.prabhupada2, IMG.class1,
    IMG.class2, IMG.tripKashi, IMG.skyline
  ].map((image, i) => ({
    title: `Self-Excellence Moment ${i + 1}`, image, category: "Programme",
    description: "A moment from our classes, festivals and pilgrimages.",
    status: "active", showInMediaHighlight: true, sortOrder: i + 1
  })));

  await VideoGallery.insertMany(videoBlogSeed.map(([title], i) => ({
    title: `${title} (Gallery)`, thumbnail: IMG.class1,
    videoUrl: "https://youtu.be/00s75c77QXA",
    description: "A recording from the Sunday programme.",
    category: "Programme", status: "active", showInMediaHighlight: true, sortOrder: i + 1
  })));
  log("gallery images and videos", 12);

  /* ---------- benefits and testimonials ---------- */
  await Benefit.insertMany([
    ["Inner clarity", IMG.gita, "Learn to think through decisions rather than react to them."],
    ["Disciplined habits", IMG.disciple, "A daily practice that holds through exam weeks and deadlines."],
    ["Better relationships", IMG.guru, "Vaishnava etiquette applied to family, hostel and workplace."],
    ["Spiritual confidence", IMG.bhagavatam, "Answer the questions friends ask, without defensiveness."],
    ["Purposeful study", IMG.gita2, "Work that is skilled and work that is meaningful are not opposites."],
    ["Service mindset", IMG.temple, "A reason to show up for other people when it is inconvenient."]
  ].map(([title, image, shortDescription], i) => ({
    title, image, shortDescription,
    fullDescription: `${shortDescription} This is one of the things students most often name when asked what changed after a year of attending.`,
    buttonText: "Read More", buttonLink: "/courses", status: "active", sortOrder: i + 1
  })));

  await Testimonial.insertMany([
    ["Aarav Mehta", "Engineering student", "The classes gave me a clear way to think, study, and stay connected with Krishna."],
    ["Kavya Shah", "Final year, B.Com", "I came for one Sunday and stayed for a year. The questions session is what kept me."],
    ["Rohan Iyer", "Software engineer", "Mayapur changed how I think about my mornings. I have kept the 5 AM habit since."],
    ["Ananya Rao", "Medical student", "The Gita course is the only thing in my week that is not about marks."],
    ["Vivek Nair", "Working professional", "I expected to feel like an outsider. Nobody made me feel like one."],
    ["Meera Joshi", "Teacher", "I bring my students now. The explanations are pitched for people who are new."]
  ].map(([name, designation, quote], i) => ({
    name, designation, quote, rating: 5, image: IMG.teacher1,
    status: "active", sortOrder: i + 1
  })));
  log("benefits and testimonials", 12);

  /* ---------- enquiries, subscribers, chat ---------- */
  console.log("\nEngagement");

  await Subscriber.insertMany([
    "wellwisher@example.com", "devotee.mumbai@example.com", "student.juhu@example.com"
  ].map((email) => ({ email, status: "active", subscribedDate: daysAgo(12) })));

  await ContactMessage.insertMany([
    { name: "Anita Shah", email: "anita@example.com", phone: "+91 98200 44444",
      subject: `Sunday Class Registration: ${classSeed[0][0]}`, classTitle: classSeed[0][0],
      message: "Registering for Sunday, bringing one guest.", status: "unread" },
    { name: "Ravi Kumar", email: "ravi@example.com", phone: "+91 98200 55555",
      subject: "Question about weekday classes",
      message: "Do you run anything on weekday evenings? Sundays are difficult for me.",
      status: "read" }
  ]);

  const room = await ChatRoom.create({
    course: courses[0]._id, participants: [students[0]._id, admin._id],
    lastMessage: "Thank you, that helps.", lastMessageAt: daysAgo(1),
    assignedToType: "admin", status: "open"
  });
  await ChatMessage.insertMany([
    { room: room._id, course: courses[0]._id, sender: students[0]._id, receiver: admin._id,
      text: "Hare Krishna. Is the Gita course recorded if I miss a session?",
      senderRole: "student", status: "read", createdAt: daysAgo(2) },
    { room: room._id, course: courses[0]._id, sender: admin._id, receiver: students[0]._id,
      text: "Hare Krishna! Yes, every session is recorded and stays in your dashboard.",
      senderRole: "admin", status: "read", createdAt: daysAgo(1) },
    { room: room._id, course: courses[0]._id, sender: students[0]._id, receiver: admin._id,
      text: "Thank you, that helps.", senderRole: "student", status: "read", createdAt: daysAgo(1) }
  ]);
  log("subscribers, enquiries, chat thread", 8);

  await Notification.insertMany([
    { audience: "admin", type: "pilgrimage_booking", title: "New pilgrimage booking",
      message: "Kavya Shah booked 1 place on the 3-Day Mayapur Youth Retreat.",
      link: "/admin/pilgrimage-bookings", createdAt: daysAgo(1) },
    { user: students[0]._id, type: "booking_approved", title: "Pilgrimage booking confirmed",
      message: "Your booking for the 5-Day Sacred Journey to Vrindavana is confirmed.",
      link: "/student/my-trips", createdAt: daysAgo(2) },
    { audience: "admin", type: "enrollment_request", title: "New enrolment request",
      message: "Ananya Rao requested enrolment in The Guru-Disciple Relationship.",
      link: "/admin/course-requests", createdAt: daysAgo(1) }
  ]);

  /* ---------- lesson comments (the doubt box) ---------- */
  const gitaLessons = await Lesson.find({ course: courses[0]._id }).sort({ order: 1 }).lean();
  const sadhanaLessons = await Lesson.find({ course: courses[3]._id }).sort({ order: 1 }).lean();

  await Comment.insertMany([
    { user: students[0]._id, course: courses[0]._id, lesson: gitaLessons[0]._id,
      text: "In the first chapter Arjuna's reasons for not fighting sound compassionate. Why does Krishna not accept them?",
      status: "replied", priority: "medium",
      adminReply: "Because they come from attachment rather than from principle \u2014 Arjuna is reasoning backwards from who he does not want to lose. Krishna addresses the attachment first, in chapter two, before he addresses the duty.",
      adminReplyUser: teachers[0]._id, adminReplyAt: daysAgo(11),
      repliedById: teachers[0]._id, repliedByRole: "teacher",
      assignedToType: "teacher", assignedTeacherId: teachers[0]._id,
      createdAt: daysAgo(12) },
    { user: students[1]._id, course: courses[0]._id, lesson: gitaLessons[1]._id,
      text: "Is it possible to act without any desire at all? That seems impossible for a student with exams.",
      status: "replied", priority: "high", isPinned: true,
      adminReply: "The instruction is not to have no desire, it is to not let the result own you. Study hard for the exam; what changes is what happens inside you when the result comes.",
      adminReplyUser: teachers[0]._id, adminReplyAt: daysAgo(6),
      repliedById: teachers[0]._id, repliedByRole: "teacher",
      assignedToType: "teacher", assignedTeacherId: teachers[0]._id,
      createdAt: daysAgo(7) },
    { user: students[2]._id, course: courses[0]._id, lesson: gitaLessons[2]._id,
      text: "Could you share the verse references used in this session? I want to read them again before Sunday.",
      status: "pending", priority: "low",
      assignedToType: "teacher", assignedTeacherId: teachers[0]._id,
      createdAt: daysAgo(2) },
    { user: students[3]._id, course: courses[3]._id, lesson: sadhanaLessons[0]._id,
      text: "I manage four rounds on most days but miss completely on hostel exam nights. Is it better to do fewer rounds daily or catch up at the weekend?",
      status: "replied", priority: "medium",
      adminReply: "Daily and small, every time. A practice that survives your worst week is worth more than one that only works in your best week. Keep the four, and add only when four feels easy.",
      adminReplyUser: teachers[2]._id, adminReplyAt: daysAgo(4),
      repliedById: teachers[2]._id, repliedByRole: "teacher",
      assignedToType: "teacher", assignedTeacherId: teachers[2]._id,
      createdAt: daysAgo(5) },
    { user: students[4]._id, course: courses[3]._id, lesson: sadhanaLessons[1]._id,
      text: "My family is not comfortable with me chanting at home. How do others handle this?",
      status: "escalated", priority: "urgent",
      adminNote: "Needs a personal call rather than a written reply. Passed to the devotee care team.",
      assignedToType: "admin",
      createdAt: daysAgo(1) },
    { user: students[5]._id, course: courses[0]._id, lesson: gitaLessons[0]._id,
      text: "Thank you for this session \u2014 the point about duty and attachment finally made sense.",
      status: "resolved", priority: "low", createdAt: daysAgo(9) }
  ]);
  log("lesson comments (replied / pending / escalated)", 6);

  /* ---------- student notes taken against the video ---------- */
  await Note.insertMany([
    { user: students[0]._id, course: courses[0]._id, lesson: gitaLessons[0]._id,
      title: "Arjuna's argument", content: "His reasons sound noble but come from attachment. Check this against ch.2 verse 11.",
      timestamp: 320 },
    { user: students[0]._id, course: courses[0]._id, lesson: gitaLessons[1]._id,
      title: "Soul is not the body", content: "The body changes continuously; the one observing the change does not. Re-watch from here.",
      timestamp: 745 },
    { user: students[1]._id, course: courses[0]._id, lesson: gitaLessons[1]._id,
      title: "Work without attachment", content: "Not about caring less. About not being owned by the result. Ask in Sunday class.",
      timestamp: 512 },
    { user: students[3]._id, course: courses[3]._id, lesson: sadhanaLessons[0]._id,
      title: "Start small", content: "Four rounds daily beats sixteen rounds twice a week. Fix a time, not a target.",
      timestamp: 180 }
  ]);
  log("student notes", 4);

  /* ---------- traffic history, so the reports page has a shape ---------- */
  const trafficPages = ["/", "/courses", "/trips", "/classes", "/blogs", "/about",
    "/visionaries", "/contact", "/trips/5-day-sacred-journey-to-vrindavana",
    "/courses/bhagavad-gita-foundations", "/gallery/images"];
  const browsers = ["Chrome", "Safari", "Firefox", "Edge"];
  const devices = ["Desktop", "Mobile", "Tablet"];
  const referrers = ["", "https://google.com", "https://instagram.com", "https://facebook.com"];
  const traffic = [];
  for (let d = 29; d >= 0; d -= 1) {
    /* a gentle upward trend with a Sunday bump, so the chart reads naturally */
    const day = daysAgo(d);
    const sundayBump = day.getDay() === 0 ? 14 : 0;
    const hits = 6 + Math.round((29 - d) / 4) + sundayBump + (d % 3);
    for (let n = 0; n < hits; n += 1) {
      const when = new Date(day);
      when.setHours(8 + (n % 14), (n * 7) % 60, 0, 0);
      traffic.push({
        pageUrl: trafficPages[(d + n) % trafficPages.length],
        ip: `198.51.100.${((d * 7 + n) % 200) + 10}`,
        browser: browsers[(d + n) % browsers.length],
        deviceType: devices[(d * 2 + n) % devices.length],
        referrer: referrers[(d + n) % referrers.length],
        createdAt: when, updatedAt: when
      });
    }
  }
  await TrafficLog.insertMany(traffic);
  log("page views across the last 30 days", traffic.length);

  /* ---------- audit trail and sessions ---------- */
  await LoginSession.insertMany([
    { user: admin._id, userName: admin.name, userRole: "main_admin", ip: "203.0.113.24",
      device: "Desktop", browser: "Chrome", os: "macOS", loginAt: daysAgo(0), active: true },
    { user: staff[1]._id, userName: staff[1].name, userRole: "manager", ip: "203.0.113.57",
      device: "Mobile", browser: "Safari", os: "iOS", loginAt: daysAgo(1), active: false, endedAt: daysAgo(1) },
    { user: teachers[0]._id, userName: teachers[0].name, userRole: "teacher", ip: "203.0.113.91",
      device: "Desktop", browser: "Firefox", os: "Windows", loginAt: daysAgo(2), active: false, endedAt: daysAgo(2) }
  ]);

  await ActivityLog.insertMany([
    { user: staff[1]._id, userName: staff[1].name, userRole: "manager", action: "create",
      source: "admin", section: "blogs", resource: "blogs", label: blogSeed[0][0],
      ip: "203.0.113.57", device: "Mobile", browser: "Safari", os: "iOS", createdAt: daysAgo(3) },
    { user: admin._id, userName: admin.name, userRole: "main_admin", action: "update",
      source: "admin", section: "trips", resource: "pilgrimages", label: trips[0].title,
      changedFields: ["pricePerPerson", "maxTravellers"],
      ip: "203.0.113.24", device: "Desktop", browser: "Chrome", os: "macOS", createdAt: daysAgo(2) },
    { userName: "Anita Shah", userRole: "visitor", action: "create", source: "public",
      section: "upcoming-classes", resource: "contact-messages",
      label: `Anita Shah registered for ${classSeed[0][0]}`,
      ip: "198.51.100.14", device: "Mobile", browser: "Chrome", os: "Android", createdAt: daysAgo(1) },
    { user: students[1]._id, userName: students[1].name, userRole: "student", action: "create",
      source: "public", section: "trip-bookings", resource: "pilgrimage-bookings",
      label: `${students[1].name} booked 1 place on ${trips[1].title}`,
      ip: "198.51.100.77", device: "Desktop", browser: "Chrome", os: "Windows", createdAt: daysAgo(1) }
  ]);
  log("login sessions and activity trail", 7);

  /* ---------- summary ---------- */
  console.log(`
Done.

  Sign in at /admin/login
    admin@iskconselfexcellence.online        Admin@2026        (main admin)
    gopal@iskconselfexcellence.online        Staff@2026        (admin)
    radhika@iskconselfexcellence.online      Staff@2026        (manager)
    nitai@iskconselfexcellence.online        Staff@2026        (editor)
    arjun@iskconselfexcellence.online        Staff@2026        (viewer)

  Teacher panel at /teacher/login
    radheshyam@iskconselfexcellence.online   Teacher@2026

  Student area at /login
    aarav@example.com                        Student@2026

  Change these before the site is public.
`);

  await mongoose.disconnect();
};

run().catch((err) => {
  console.error("\nSeed failed:", err.message);
  process.exit(1);
});
