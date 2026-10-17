const img = (id, w = 1200, h = 800) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&h=${h}&q=85`;

export const images = {
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

export const heroBanners = [
  {
    _id: "default-hero",
    title: "Empowering Students for Spiritual & Personal Excellence",
    subtitle: "Welcome to ISKCON Juhu Self-Excellence",
    buttonText: "Explore Courses",
    buttonLink: "/courses",
    desktopImage: images.hero,
    isActive: true,
    order: 1
  }
];

export const homeSections = [
  { sectionKey: "upcoming_classes", sectionTitle: "Upcoming Classes On Sunday", sectionSubtitle: "Timing 6 PM to 9 PM" },
  { sectionKey: "courses", sectionTitle: "Explore All the Courses", sectionSubtitle: "Designed by Experts" },
  { sectionKey: "about", sectionTitle: "Empowering Students to Achieve Spiritual & Personal Excellence", sectionSubtitle: "Welcome to ISKCON Juhu Self-Excellence", content: { description: "The ISKCON Juhu Self-Excellence Classes help students align their lives with higher spiritual values while excelling in academics, relationships, and personal growth." }, images: [images.temple, images.youth], buttonText: "Know More", buttonLink: "/about" },
  { sectionKey: "video_intro", sectionTitle: "Experience a Class", sectionSubtitle: "Watch how spiritual wisdom becomes practical learning", image: images.class, videoUrl: "https://www.youtube.com/embed/ysz5S6PUM-U" },
  { sectionKey: "preachers", sectionTitle: "Our Qualified Preachers", sectionSubtitle: "Experienced Devotees Trained to Lead with Purpose and Purity" },
  { sectionKey: "benefits", sectionTitle: "Benefits of Self-Excellence Classes", sectionSubtitle: "Self-Excellence is not just improvement - it is inner transformation." },
  { sectionKey: "blogs", sectionTitle: "Latest Blogs", sectionSubtitle: "Insights for spiritual living and student excellence", buttonText: "View All Blogs", buttonLink: "/blogs" },
  { sectionKey: "video_blogs", sectionTitle: "Video Blogs", sectionSubtitle: "Short messages, class highlights, and festival reflections", buttonText: "Watch More", buttonLink: "/video-blogs" },
  { sectionKey: "media_highlight", sectionTitle: "Media Highlight", sectionSubtitle: "Glimpses of our temple, festivals, and spiritual activities." },
  { sectionKey: "testimonials", sectionTitle: "Student Reflections", sectionSubtitle: "How the classes are shaping hearts and habits" },
  { sectionKey: "newsletter", sectionTitle: "Signup for latest news and insights from ISKCON Juhu Self-Excellence" }
];

export const courses = ["Gita Gyan", "Bhagavatam Classes", "Shivpuran Classes", "Life Lesson", "Life Goal", "Decision Making"].map((title, index) => ({
  _id: `course-${index}`,
  title,
  slug: title.toLowerCase().replaceAll(" ", "-"),
  thumbnail: [images.books, images.temple, images.devotion, images.youth, images.meditation, images.learning][index],
  bannerImage: [images.books, images.temple, images.devotion, images.youth, images.meditation, images.learning][index],
  shortDescription: "A practical spiritual course designed by experienced devotees for modern student life.",
  description: "<p>Learn scripture, habits, reflection, and daily spiritual practice through guided lessons and downloadable resources.</p>",
  category: index % 2 === 0 ? "Scripture" : "Self-Excellence",
  level: index < 2 ? "Beginner" : index < 4 ? "Intermediate" : "Advanced",
  duration: `${4 + index} weeks`,
  totalLessons: 2,
  priceType: "Free",
  price: 0,
  isFree: true,
  isActive: true,
  order: index + 1,
  teacher: { name: ["HG Radheshyam Das", "HG Govind Priya Das", "HG Madhava Mohan Das"][index % 3] },
  whatYouWillLearn: ["Understand spiritual principles", "Build daily habits", "Apply Vedic wisdom"],
  lessons: [
    { _id: `${index}-lesson-1`, title: `${title} - Foundation`, slug: "foundation", description: "Begin with the foundations and spiritual context.", duration: "18 min", isPreview: true, videoType: "youtube", youtubeUrl: "https://www.youtube.com/embed/ysz5S6PUM-U", videoUrl: "https://www.youtube.com/embed/ysz5S6PUM-U", pdfFile: "/uploads/sample/foundation-notes.pdf", order: 1, isActive: true },
    { _id: `${index}-lesson-2`, title: `${title} - Practical Application`, slug: "practical-application", description: "Apply the teaching with reflection and practice.", duration: "24 min", videoType: "youtube", youtubeUrl: "https://www.youtube.com/embed/jfKfPfyJRdk", videoUrl: "https://www.youtube.com/embed/jfKfPfyJRdk", order: 2, isActive: true }
  ]
}));

export const upcoming = ["Idol Worship or Divine Connection", "Aakhir Kaun Hai Ye Jagannath?", "Yogini Ekadashi"].map((title, index) => ({
  _id: `class-${index}`,
  title,
  slug: title.toLowerCase().replaceAll(" ", "-").replaceAll("?", ""),
  image: [images.devotion, images.festival, images.meditation][index],
  date: ["2026-06-07", "2026-06-14", "2026-06-21"][index],
  time: "6 PM to 9 PM",
  venue: "ISKCON Juhu",
  speaker: ["HG Radheshyam Das", "HG Madhava Mohan Das", "HG Govind Priya Das"][index],
  shortDescription: "Join a thoughtful Sunday class with discussion, reflection, and practical takeaways.",
  buttonText: "Register",
  buttonLink: "/contact"
}));

export const preachers = ["HG Radheshyam Das", "HG Govind Priya Das", "HG Madhava Mohan Das", "HG Shyam Sundar Das", "HG Nityananda Das", "HG Gauranga Das"].map((name, index) => ({
  _id: `preacher-${index}`,
  name,
  slug: name.toLowerCase().replaceAll(" ", "-"),
  type: index < 2 ? "Founder" : "Team Member",
  image: [images.devotion, images.meditation, images.temple, images.learning, images.festival, images.books][index],
  designation: ["Senior Gita Mentor", "Bhagavatam Teacher", "Youth Mentor", "Life Coach", "Kirtan Guide", "Wisdom Facilitator"][index],
  shortBio: "Experienced devotee helping students connect spiritual wisdom with modern life.",
  fullBio: "A caring teacher with years of mentoring experience in scripture, discipline, devotional culture, and practical student growth.",
  experience: `${8 + index} years`,
  specialization: ["Scripture", "Youth guidance", "Self excellence"]
}));

export const benefits = ["Inner clarity", "Disciplined habits", "Better relationships", "Spiritual confidence", "Purposeful study", "Service mindset"].map((title, index) => ({
  _id: `benefit-${index}`,
  title,
  image: [images.meditation, images.learning, images.youth, images.books, images.class, images.temple][index],
  shortDescription: "Grow through reflective learning, discussion, and spiritual practice.",
  buttonText: "Read More",
  buttonLink: "/about"
}));

export const blogs = ["Why Students Need Spiritual Anchoring", "Five Lessons from the Bhagavad-gita", "How to Build a Sunday Learning Habit", "Decision Making with Dharma", "Purpose Beyond Performance", "The Power of Satsang"].map((title, index) => ({
  _id: `blog-${index}`,
  title,
  slug: title.toLowerCase().replaceAll(" ", "-"),
  image: [images.youth, images.books, images.class, images.learning, images.meditation, images.festival][index],
  shortDescription: "A practical reflection for students and seekers in modern life.",
  content: "<p>Spiritual education becomes powerful when it touches ordinary decisions. Use these reflections for discussion, journaling, and daily practice.</p>",
  author: { name: "ISKCON Juhu Self-Excellence" },
  category: index % 2 === 0 ? "Youth" : "Wisdom",
  tags: ["ISKCON", "Self-Excellence"]
}));

export const videoBlogs = ["Sunday Class Highlight", "How to Start Reading Gita", "Festival Reflections", "Teacher Message for Students"].map((title, index) => ({
  _id: `video-blog-${index}`,
  title,
  slug: title.toLowerCase().replaceAll(" ", "-"),
  thumbnail: [images.class, images.books, images.festival, images.devotion][index],
  videoUrl: "https://www.youtube.com/embed/ysz5S6PUM-U",
  shortDescription: "Watch a short spiritual learning highlight from our community.",
  description: "A curated video message designed to inspire steady practice and deeper learning."
}));

export const galleryImages = Array.from({ length: 8 }).map((_, index) => ({
  _id: `gallery-img-${index}`,
  title: `Self-Excellence Moment ${index + 1}`,
  image: [images.temple, images.festival, images.class, images.youth, images.books, images.meditation, images.learning, images.devotion][index],
  category: index % 2 === 0 ? "Classes" : "Temple"
}));

export const galleryVideos = Array.from({ length: 4 }).map((_, index) => ({
  _id: `gallery-video-${index}`,
  title: `Video Gallery Highlight ${index + 1}`,
  thumbnail: [images.class, images.festival, images.temple, images.learning][index],
  videoUrl: "https://www.youtube.com/embed/ysz5S6PUM-U",
  description: "Short video highlight from ISKCON Juhu activities."
}));

export const footer = {
  logo: "/logo-black-header.png",
  description: "ISKCON Juhu Self-Excellence helps students grow through scripture, discipline, community, and practical spiritual learning.",
  columns: [
    { title: "Quick Links", links: [{ label: "Home", url: "/" }, { label: "About", url: "/about" }, { label: "Courses", url: "/courses" }, { label: "Contact", url: "/contact" }] },
    { title: "Learning", links: [{ label: "Visionaries", url: "/visionaries" }, { label: "Blogs", url: "/blogs" }, { label: "Video Blogs", url: "/video-blogs" }] },
    { title: "Legal", links: [{ label: "Privacy Policy", url: "/privacy-policy" }, { label: "Terms and Conditions", url: "/terms-and-conditions" }, { label: "Sitemap", url: "/sitemap" }] }
  ],
  contactDetails: { address: "ISKCON Juhu, Hare Krishna Land, Juhu, Mumbai", phone: "+91 22 2620 6860", email: "selfexcellence@iskconjuhu.in" },
  copyrightText: "ISKCON Juhu Self-Excellence. All Rights Reserved.",
  copyrightYear: 2026
};
