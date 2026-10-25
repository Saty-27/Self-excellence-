import "dotenv/config";
import mongoose from "mongoose";
import { UpcomingClass, Book } from "./models.js";

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

  await mongoose.disconnect();
  console.log("Done successfully!");
}

run().catch((err) => {
  console.error("Sync error:", err);
  process.exit(1);
});
