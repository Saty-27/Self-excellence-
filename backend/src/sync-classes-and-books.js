import "dotenv/config";
import mongoose from "mongoose";
import { UpcomingClass, Book, Course, Lesson, CourseContent, User } from "./models.js";

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/iskcon-lms";

async function run() {
  console.log("Connecting to MongoDB:", MONGO_URI);
  await mongoose.connect(MONGO_URI);

  const officialClasses = [
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
      fullDescription: "Join us for an enlightening discourse titled \"The Price of Pleasing Your Palate\" presented by Narottam Das Thakur Prabhu (Senior Data Analyst) as part of the Self Excellence Youth series at ISKCON Juhu.\n\nThis session delves into understanding dietary habits, sense control, and the true value of mindful spiritual choices over immediate sensory pleasures.\n\nThe evening is open to everyone, whether or not you have attended before. There is no charge, and prasadam is served to all who stay.",
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
      fullDescription: "Join us for a transformative session titled \"What You Eat Matters\" presented by HG Adbhuta Hari Prabhuji (Monk, Life Coach - Europe) as part of the Self Excellence Youth series at ISKCON Juhu.\n\nIn a fast-paced world dominated by instant gratification and unhealthy dietary habits, this discourse sheds light on the profound link between what we consume, our state of mind, and our spiritual well-being. Learn practical insights on cultivating mindful, sattvic eating habits that elevate both body and soul.\n\nThe evening is open to everyone, whether or not you have attended before. There is no charge, and prasadam is served to all who stay.",
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
      fullDescription: "Join us for Thursday's Special Srimad Bhagavad Gita Lecture delivered by HG Adbhuta Hari Prabhuji (Monk, Life Coach - Europe) at ISKCON Juhu.\n\nDive deep into the practical philosophy of the Bhagavad Gita to navigate life's daily dilemmas, discover purposeful living, and cultivate lasting spiritual strength. Please note that this specific session is organized exclusively for boys.\n\nThe evening is open to all boys, whether or not you have attended before. There is no charge, and sumptuous prasadam is served to all who stay!",
      videoUrl: "",
      youtubeUrl: "",
      status: "active",
      showOnHomepage: true,
      sortOrder: 3
    }
  ];

  console.log("Upserting official upcoming classes...");
  for (const c of officialClasses) {
    const res = await UpcomingClass.findOneAndUpdate(
      { slug: c.slug },
      { $set: c },
      { upsert: true, new: true }
    );
    console.log(" -> Class:", res.title, `(${res.slug})`);
  }

  console.log("Upserting Bhagavad Gita As It Is book...");
  const book = await Book.findOneAndUpdate(
    { slug: "bhagavad-gita" },
    {
      $set: {
        title: "Bhagavad Gita As It Is",
        subtitle: "With Original Sanskrit Text, Translation and Elaborate Purports",
        authorOrTranslator: "His Divine Grace A.C. Bhaktivedanta Swami Prabhupada",
        pricePerBook: 280,
        mrp: 350,
        gstPercent: 18,
        coverImage: "/uploads/books/bhagavad-gita-as-it-is.png",
        allowBuy: true,
        allowDistribute: true,
        isActive: true,
        displayOrder: 1,
        shortDescription: "The timeless conversation between Krishna and Arjuna on duty, devotion and the self by A.C. Bhaktivedanta Swami Prabhupada.",
        fullDescription: `<p>The Bhagavad Gita is the essence of Vedic knowledge and one of the most important Upanishads in Vedic literature. Spoken by Lord Krishna to His intimate disciple Arjuna on the battlefield of Kurukshetra, it provides definitive guidance on the science of self-realisation.</p><p>Through clear explanations of karma-yoga, jnana-yoga, and bhakti-yoga, this sacred dialogue illuminates the nature of consciousness, the soul, the universe, and the Supreme Truth, providing practical principles for peaceful living and spiritual growth in everyday life.</p>`
      }
    },
    { upsert: true, new: true }
  );
  console.log(" -> Book:", book.title, `₹${book.pricePerBook} (GST: ${book.gstPercent}%)`);

  console.log("Upserting Shrimad Bhagavatam book...");
  // Update existing bhagavatam-puran or upsert shrimad-bhagavatam
  await Book.deleteMany({ slug: "bhagavatam-puran" }).catch(() => null);
  const bhagavatam = await Book.findOneAndUpdate(
    { slug: "shrimad-bhagavatam" },
    {
      $set: {
        title: "Shrimad Bhagavatam",
        subtitle: "The Immaculate Purana by A.C. Bhaktivedanta Swami Prabhupada",
        authorOrTranslator: "His Divine Grace A.C. Bhaktivedanta Swami Prabhupada",
        pricePerBook: 9100,
        mrp: 11000,
        gstPercent: 18,
        coverImage: "/uploads/books/shrimad-bhagavatam.jpg",
        language: "Hindi & English",
        binding: "Deluxe Hardcover Edition",
        allowBuy: true,
        allowDistribute: true,
        minBuyQty: 1,
        maxBuyQty: 100,
        minDistributeQty: 1,
        maxDistributeQty: 100000,
        distributionPresets: [1, 5, 10, 25, 50, 100],
        isActive: true,
        displayOrder: 2,
        shortDescription: "The spotless Purana presenting the science of Krishna and devotional surrender by A.C. Bhaktivedanta Swami Prabhupada.",
        fullDescription: `<p>Srimad Bhagavatam, known as the spotless Purana, is celebrated as the ripened fruit of the desire tree of Vedic literature. Translated and elucidated by His Divine Grace A.C. Bhaktivedanta Swami Prabhupada, it focuses entirely on transcendental devotion and glorifies the divine pastimes and attributes of the Supreme Personality of Godhead.</p><p>From the philosophical inquiries of King Pariksit and Sukadeva Goswami to the deep wisdom of devotional surrender, the Bhagavatam is a profound lighthouse guiding souls toward pure love of God and eternal joy.</p>`,
        highlights: [
          "The complete spotless Purana and cream of Vedic literature",
          "Authentic Sanskrit verses, Roman transliteration and elaborate purports",
          "Immortal pastimes of Supreme Lord Sri Krishna and His pure devotees",
          "A timeless treasure for every home and spiritual institution"
        ]
      }
    },
    { upsert: true, new: true }
  );
  console.log(" -> Book:", bhagavatam.title, `₹${bhagavatam.pricePerBook} (GST: ${bhagavatam.gstPercent}%)`);

  console.log("Upserting The Nectar of Devotion book...");
  const nod = await Book.findOneAndUpdate(
    { slug: "the-nectar-of-devotion" },
    {
      $set: {
        title: "The Nectar of Devotion",
        slug: "the-nectar-of-devotion",
        subtitle: "The Complete Science of Bhakti-Yoga by A.C. Bhaktivedanta Swami Prabhupada",
        authorOrTranslator: "His Divine Grace A.C. Bhaktivedanta Swami Prabhupada",
        pricePerBook: 250,
        mrp: 320,
        gstPercent: 18,
        coverImage: "/uploads/books/the-nectar-of-devotion.jpg",
        language: "Hindi & English",
        binding: "Deluxe Edition",
        allowBuy: true,
        allowDistribute: true,
        minBuyQty: 1,
        maxBuyQty: 100,
        minDistributeQty: 10,
        maxDistributeQty: 100000,
        distributionPresets: [10, 50, 100, 250, 500, 600, 700, 1000],
        isActive: true,
        displayOrder: 3,
        shortDescription: "A summary study of Srila Rupa Goswami's Bhakti-rasamrta-sindhu, presenting the definitive science of devotional service.",
        fullDescription: `<p>The Nectar of Devotion is a summary study of Sri Rupa Goswami’s Bhakti-rasamrta-sindhu, authored by His Divine Grace A.C. Bhaktivedanta Swami Prabhupada. It systematically presents the science of bhakti-yoga—the path of divine love and devotional service to Lord Krishna.</p><p>Covering the fundamental practices of sadhana-bhakti, the symptoms of ecstatic love (bhava-bhakti), and the ultimate perfection of pure unalloyed love of God (prema-bhakti), this masterpiece serves as an indispensable handbook for anyone seeking true spiritual fulfilment.</p>`,
        highlights: [
          "The definitive guidebook for the complete science of Bhakti-yoga",
          "Systematic explanation of 64 foundational devotional practices",
          "Illuminates stages of devotional development from faith to pure divine love",
          "Authorized summary study of Srila Rupa Goswami's Bhakti-rasamrta-sindhu"
        ]
      }
    },
    { upsert: true, new: true }
  );
  console.log(" -> Book:", nod.title, `₹${nod.pricePerBook} (GST: ${nod.gstPercent}%)`);

  console.log("Upserting Beyond Birth & Death book...");
  const bbd = await Book.findOneAndUpdate(
    { slug: "beyond-birth-and-death" },
    {
      $set: {
        title: "Beyond Birth & Death",
        slug: "beyond-birth-and-death",
        subtitle: "Transcendental Knowledge of Reincarnation and the Soul",
        authorOrTranslator: "His Divine Grace A.C. Bhaktivedanta Swami Prabhupada",
        pricePerBook: 45,
        mrp: 60,
        gstPercent: 18,
        coverImage: "/uploads/books/beyond-birth-and-death.jpg",
        language: "Hindi & English",
        binding: "Pocket Paperback",
        allowBuy: true,
        allowDistribute: true,
        minBuyQty: 1,
        maxBuyQty: 1000,
        minDistributeQty: 10,
        maxDistributeQty: 100000,
        distributionPresets: [10, 50, 100, 250, 500, 1000, 5000],
        isActive: true,
        displayOrder: 4,
        shortDescription: "A concise, illuminating guide to the science of the soul, reincarnation, and how to transcend the cycle of repeated birth and death.",
        fullDescription: `<p>Beyond Birth and Death offers clear, definitive answers to humanity's greatest mysteries: What happens to consciousness after bodily death? Is reincarnation real? How can the soul achieve eternal liberation?</p><p>Drawing from the timeless verses of the Bhagavad Gita and ancient Vedic wisdom, His Divine Grace A.C. Bhaktivedanta Swami Prabhupada reveals how by practicing simple, authentic bhakti-yoga meditation, anyone can awaken their eternal spiritual identity and transcend material suffering forever.</p>`,
        highlights: [
          "The definitive introductory guide to the science of reincarnation and the soul",
          "Explains how the mind and desires shape our next destination",
          "Practical instructions on meditation and awakening eternal spiritual consciousness",
          "Direct insights drawn from the Bhagavad Gita"
        ]
      }
    },
    { upsert: true, new: true }
  );
  console.log(" -> Book:", bbd.title, `₹${bbd.pricePerBook} (GST: ${bbd.gstPercent}%)`);

  console.log("Upserting Coming Back book...");
  const cb = await Book.findOneAndUpdate(
    { slug: "coming-back" },
    {
      $set: {
        title: "Coming Back",
        slug: "coming-back",
        subtitle: "The Science of Reincarnation",
        authorOrTranslator: "His Divine Grace A.C. Bhaktivedanta Swami Prabhupada",
        pricePerBook: 40,
        mrp: 50,
        gstPercent: 18,
        coverImage: "/uploads/books/coming-back.jpg",
        language: "Hindi & English",
        binding: "Pocket Paperback",
        allowBuy: true,
        allowDistribute: true,
        minBuyQty: 1,
        maxBuyQty: 1000,
        minDistributeQty: 10,
        maxDistributeQty: 100000,
        distributionPresets: [10, 50, 100, 250, 500, 1000, 5000],
        isActive: true,
        displayOrder: 5,
        shortDescription: "An extraordinary, eye-opening exploration into the documented science and Vedic reality of past lives, reincarnation, and destiny.",
        fullDescription: `<p>Coming Back: The Science of Reincarnation explores one of life’s most fascinating and misunderstood subjects. Is life after death a fantasy or a scientific reality? How do our current desires and choices determine our future body and circumstances?</p><p>Based on the profound teachings of His Divine Grace A.C. Bhaktivedanta Swami Prabhupada and the ancient Vedic wisdom of the Bhagavad Gita and Srimad Bhagavatam, this book offers logical explanations, real-world case histories, and practical spiritual guidance for taking control of your spiritual destiny.</p>`,
        highlights: [
          "Compelling examination of past-life memories and near-death experiences",
          "Clear, logical explanation of the universal law of karma and rebirth",
          "Reveals how consciousness transmigrates from one body to the next",
          "Practical techniques to break free from the cycle of rebirth"
        ]
      }
    },
    { upsert: true, new: true }
  );
  console.log(" -> Book:", cb.title, `₹${cb.pricePerBook} (GST: ${cb.gstPercent}%)`);

  console.log("Upserting Brahmacharya Classes course...");
  await Course.updateMany(
    { slug: { $ne: "brahmacharya-classes" }, order: 1 },
    { $set: { order: 2 } }
  ).catch(() => null);

  const teacherUser = await User.findOne({
    $or: [{ name: /Adbhuta/i }, { role: "teacher" }, { role: "main_admin" }, { role: "admin" }]
  });

  const course = await Course.findOneAndUpdate(
    { slug: "brahmacharya-classes" },
    {
      $set: {
        title: "Brahmacharya Classes",
        slug: "brahmacharya-classes",
        thumbnail: "/uploads/courses/brahmacharya.jpg",
        bannerImage: "/uploads/courses/brahmacharya.jpg",
        category: "Brahmacharya & Youth Excellence",
        level: "Beginner",
        duration: "3 weeks",
        priceType: "Free",
        price: 0,
        isFree: true,
        enrollmentType: ["free"],
        featured: true,
        showOnHomepage: true,
        status: "published",
        isActive: true,
        order: 1,
        teacher: teacherUser?._id,
        primaryTeacherId: teacherUser?._id,
        createdBy: teacherUser?._id,
        shortDescription: "A foundational youth course on fearlessness, overcoming material desires, and spiritual discipline in Brahmacharya by HG Adbhuta Hari Prabhu.",
        description: `Brahmacharya Classes offer deep, practical, and philosophical clarity for youth on mastering the senses, conquering fear through Krishna consciousness, and understanding why material desires can never bring lasting satisfaction.\n\nDelivered by HG Adbhuta Hari Prabhuji (Monk & Life Coach) at ISKCON Juhu, this free structured course guides sincere seekers toward purposeful living, mental strength, and unwavering devotion to Lord Krishna.`,
        whatYouWillLearn: [
          "Cultivate fearlessness and mental clarity through Krishna Consciousness",
          "Understand the spiritual psychology behind material desires and sense control",
          "Daily sadhana and practical habits for living a purposeful, disciplined life",
          "Direct answers and personal guidance on youth dilemmas and spiritual growth"
        ]
      }
    },
    { upsert: true, new: true }
  );
  console.log(" -> Course:", course.title, `(${course.slug}) - Free: ${course.isFree}`);

  const lessonsData = [
    {
      title: "Fearlessness In Krishna Consciousness",
      slug: "fearlessness-in-krishna-consciousness",
      order: 1,
      sortOrder: 1,
      isPreview: true,
      youtubeUrl: "https://www.youtube.com/watch?v=2CwOVLHG_S0",
      videoUrl: "https://www.youtube.com/watch?v=2CwOVLHG_S0",
      description: "Lesson 1: Cultivating genuine fearlessness, deep mental resilience, and spiritual security through Krishna consciousness with HG Adbhuta Hari Prabhuji at ISKCON Juhu."
    },
    {
      title: "Fearlessness In Krishna Consciousness (Brahmacharya In KC) By Adbhuta Hari Pr I 17th Oct, 2026",
      slug: "fearlessness-in-krishna-consciousness-part-2",
      order: 2,
      sortOrder: 2,
      isPreview: false,
      youtubeUrl: "https://www.youtube.com/watch?v=jIvFZoz7KCA",
      videoUrl: "https://www.youtube.com/watch?v=jIvFZoz7KCA",
      description: "Lesson 2: Exploring the foundational philosophy and daily discipline of Brahmacharya in Krishna Consciousness by HG Adbhuta Hari Prabhu (17th Oct, 2026)."
    },
    {
      title: "Why Material Desires Never Bring Happiness? (Brahmacharya In KC) By Adbhuta Hari Pr I 10th Oct, 2026",
      slug: "why-material-desires-never-bring-happiness",
      order: 3,
      sortOrder: 3,
      isPreview: false,
      youtubeUrl: "https://www.youtube.com/watch?v=uIgDTE1E6E0",
      videoUrl: "https://www.youtube.com/watch?v=uIgDTE1E6E0",
      description: "Lesson 3: Understanding why material desires fail to satisfy the soul and how to direct the mind toward eternal spiritual joy by HG Adbhuta Hari Prabhu (10th Oct, 2026)."
    }
  ];

  for (const ld of lessonsData) {
    const lesson = await Lesson.findOneAndUpdate(
      { course: course._id, slug: ld.slug },
      {
        $set: {
          course: course._id,
          title: ld.title,
          slug: ld.slug,
          description: ld.description,
          videoType: "youtube",
          youtubeUrl: ld.youtubeUrl,
          videoUrl: ld.videoUrl,
          thumbnail: "/uploads/courses/brahmacharya.jpg",
          order: ld.order,
          sortOrder: ld.sortOrder,
          isPreview: ld.isPreview,
          status: "active",
          publishStatus: "published",
          commentsEnabled: true,
          notesEnabled: true,
          chatEnabled: true,
          createdBy: teacherUser?._id,
          videoSettings: {
            disableSeeking: false,
            enableCompleteButton: true
          }
        }
      },
      { upsert: true, new: true }
    );
    console.log("   -> Lesson", lesson.order, ":", lesson.title);

    await CourseContent.findOneAndUpdate(
      { course: course._id, lesson: lesson._id },
      {
        $set: {
          course: course._id,
          lesson: lesson._id,
          type: "video",
          title: lesson.title,
          slug: `${lesson.slug}-content`,
          order: lesson.order,
          isRequired: true,
          isActive: true,
          videoType: "youtube",
          youtubeUrl: lesson.youtubeUrl,
          videoUrl: lesson.videoUrl,
          thumbnail: lesson.thumbnail,
          videoSettings: {
            disableSeeking: false,
            enableCompleteButton: true,
            completionThreshold: 80
          }
        }
      },
      { upsert: true, new: true }
    );
  }

  console.log("Upserting Bhagavad Gita course...");
  const bgCourse = await Course.findOneAndUpdate(
    { slug: "bhagavad-gita" },
    {
      $set: {
        title: "Bhagavad Gita",
        slug: "bhagavad-gita",
        thumbnail: "/uploads/courses/bhagavad-gita.jpg",
        bannerImage: "/uploads/courses/bhagavad-gita.jpg",
        category: "Scripture & Philosophy",
        level: "Beginner",
        duration: "Every Thursday",
        priceType: "Free",
        price: 0,
        isFree: true,
        enrollmentType: ["free"],
        featured: true,
        showOnHomepage: true,
        status: "published",
        isActive: true,
        order: 2,
        teacher: teacherUser?._id,
        primaryTeacherId: teacherUser?._id,
        createdBy: teacherUser?._id,
        shortDescription: "A transformative Thursday study series on the verses and philosophy of Srimad Bhagavad Gita by HG Adbhuta Hari Prabhuji.",
        description: `The Bhagavad Gita series offers a verse-by-verse and thematic exploration of Lord Krishna's timeless dialogue with Arjuna, uncovering practical spiritual wisdom for mental clarity, inner peace, and divine connection.\n\nDelivered every Thursday by HG Adbhuta Hari Prabhuji (Monk & Life Coach) at ISKCON Juhu, this structured course guides students through the deep philosophy of karma, jnana, and bhakti to live with purpose and spiritual excellence.`,
        whatYouWillLearn: [
          "Gain practical insights from verse-by-verse wisdom of Srimad Bhagavad Gita",
          "Understand the psychological mechanics of the mind, senses, and false ego",
          "Overcome the illusion of control and surrender anxiety to the Supreme",
          "Apply the teachings of Karma Yoga and Bhakti Yoga in contemporary daily life"
        ]
      }
    },
    { upsert: true, new: true }
  );
  console.log(" -> Course:", bgCourse.title, `(${bgCourse.slug}) - Free: ${bgCourse.isFree}`);

  const bgLessons = [
    {
      title: "The Illusion Of Control (BG 7.15) by HG Adbhuta Hari Prabhuji | 15th October, 2026",
      slug: "the-illusion-of-control-bg-7-15",
      order: 1,
      sortOrder: 1,
      isPreview: true,
      youtubeUrl: "https://www.youtube.com/watch?v=SaQS2HiNahE",
      videoUrl: "https://www.youtube.com/watch?v=SaQS2HiNahE",
      description: "Lesson 1: An in-depth discourse exploring Bhagavad Gita 7.15, breaking down the illusion of material control and finding genuine shelter and surrender at the lotus feet of Krishna."
    }
  ];

  for (const ld of bgLessons) {
    const lesson = await Lesson.findOneAndUpdate(
      { course: bgCourse._id, slug: ld.slug },
      {
        $set: {
          course: bgCourse._id,
          title: ld.title,
          slug: ld.slug,
          description: ld.description,
          videoType: "youtube",
          youtubeUrl: ld.youtubeUrl,
          videoUrl: ld.videoUrl,
          thumbnail: "/uploads/courses/bhagavad-gita.jpg",
          order: ld.order,
          sortOrder: ld.sortOrder,
          isPreview: ld.isPreview,
          status: "active",
          publishStatus: "published",
          commentsEnabled: true,
          notesEnabled: true,
          chatEnabled: true,
          createdBy: teacherUser?._id,
          videoSettings: {
            disableSeeking: false,
            enableCompleteButton: true
          }
        }
      },
      { upsert: true, new: true }
    );
    console.log("   -> Lesson", lesson.order, ":", lesson.title);

    await CourseContent.findOneAndUpdate(
      { course: bgCourse._id, lesson: lesson._id },
      {
        $set: {
          course: bgCourse._id,
          lesson: lesson._id,
          type: "video",
          title: lesson.title,
          slug: `${lesson.slug}-content`,
          order: lesson.order,
          isRequired: true,
          isActive: true,
          videoType: "youtube",
          youtubeUrl: lesson.youtubeUrl,
          videoUrl: lesson.videoUrl,
          thumbnail: lesson.thumbnail,
          videoSettings: {
            disableSeeking: false,
            enableCompleteButton: true,
            completionThreshold: 80
          }
        }
      },
      { upsert: true, new: true }
    );
  }

  console.log("Upserting How To Improve Your Japa course...");
  const hayagrivaUser = await User.findOne({
    $or: [{ name: /Hayagriva/i }, { role: "teacher" }, { role: "main_admin" }, { role: "admin" }]
  });

  const japaCourse = await Course.findOneAndUpdate(
    { slug: "how-to-improve-your-japa" },
    {
      $set: {
        title: "How To Improve Your Japa?",
        slug: "how-to-improve-your-japa",
        thumbnail: "/uploads/courses/how-to-improve-your-japa.jpg",
        bannerImage: "/uploads/courses/how-to-improve-your-japa.jpg",
        category: "Meditation & Sadhana",
        level: "Beginner",
        duration: "Self Paced",
        priceType: "Free",
        price: 0,
        isFree: true,
        enrollmentType: ["free"],
        featured: true,
        showOnHomepage: true,
        status: "published",
        isActive: true,
        order: 3,
        teacher: hayagrivaUser?._id,
        primaryTeacherId: hayagrivaUser?._id,
        createdBy: hayagrivaUser?._id,
        shortDescription: "Practical techniques and spiritual focus to overcome distractions and deepen your daily chanting meditation by HG Hayagriva Charan Das.",
        description: `Chanting the Holy Names (Maha-Mantra) is the foremost spiritual practice in Kali-yuga. Yet, many seekers struggle with wandering thoughts, drowsiness, and lack of taste in Japa.\n\nIn this focused guide, HG Hayagriva Charan Das (B.Tech From NIT Raipur) shares transformative, practical, and scripturally grounded methods to bring discipline, attentive listening, and heartfelt absorption into your daily Japa meditation.`,
        whatYouWillLearn: [
          "Practical techniques for maintaining posture, alertness, and mind control during Japa",
          "The science of attentive hearing (Sravanam) and purifying wandering thoughts",
          "Understanding the offenses to avoid for rapid spiritual advancement",
          "Developing consistency and genuine taste in chanting the Hare Krishna Maha-Mantra"
        ]
      }
    },
    { upsert: true, new: true }
  );
  console.log(" -> Course:", japaCourse.title, `(${japaCourse.slug}) - Free: ${japaCourse.isFree}`);

  const japaLessons = [
    {
      title: "How To Improve Your Japa? By HG Hayagriva Charan Das (B.Tech From NIT Raipur) | 20th March, 2026",
      slug: "how-to-improve-your-japa-by-hg-hayagriva-charan-das",
      order: 1,
      sortOrder: 1,
      isPreview: true,
      youtubeUrl: "https://www.youtube.com/watch?v=Kmwm9UTqyRc",
      videoUrl: "https://www.youtube.com/watch?v=Kmwm9UTqyRc",
      description: "Lesson 1: Practical techniques and spiritual focus to overcome distractions and deepen your daily chanting meditation by HG Hayagriva Charan Das (B.Tech From NIT Raipur)."
    }
  ];

  for (const ld of japaLessons) {
    const lesson = await Lesson.findOneAndUpdate(
      { course: japaCourse._id, slug: ld.slug },
      {
        $set: {
          course: japaCourse._id,
          title: ld.title,
          slug: ld.slug,
          description: ld.description,
          videoType: "youtube",
          youtubeUrl: ld.youtubeUrl,
          videoUrl: ld.videoUrl,
          thumbnail: "/uploads/courses/how-to-improve-your-japa.jpg",
          order: ld.order,
          sortOrder: ld.sortOrder,
          isPreview: ld.isPreview,
          status: "active",
          publishStatus: "published",
          commentsEnabled: true,
          notesEnabled: true,
          chatEnabled: true,
          createdBy: hayagrivaUser?._id,
          videoSettings: {
            disableSeeking: false,
            enableCompleteButton: true
          }
        }
      },
      { upsert: true, new: true }
    );
    console.log("   -> Lesson", lesson.order, ":", lesson.title);

    await CourseContent.findOneAndUpdate(
      { course: japaCourse._id, lesson: lesson._id },
      {
        $set: {
          course: japaCourse._id,
          lesson: lesson._id,
          type: "video",
          title: lesson.title,
          slug: `${lesson.slug}-content`,
          order: lesson.order,
          isRequired: true,
          isActive: true,
          videoType: "youtube",
          youtubeUrl: lesson.youtubeUrl,
          videoUrl: lesson.videoUrl,
          thumbnail: lesson.thumbnail,
          videoSettings: {
            disableSeeking: false,
            enableCompleteButton: true,
            completionThreshold: 80
          }
        }
      },
      { upsert: true, new: true }
    );
  }

  await mongoose.disconnect();
  console.log("Done successfully!");
}

run().catch((err) => {
  console.error("Sync error:", err);
  process.exit(1);
});
