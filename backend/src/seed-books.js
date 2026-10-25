import "dotenv/config";
import mongoose from "mongoose";
import { Book, BookPaymentSetting } from "./models.js";

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/iskcon-lms";

const img = (id, w = 1200, h = 1600) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&h=${h}&q=85`;

const canonicalBooks = [
  {
    displayOrder: 1,
    title: "Bhagavad Gita As It Is",
    slug: "bhagavad-gita",
    subtitle: "With Original Sanskrit Text, Translation and Elaborate Purports",
    authorOrTranslator: "His Divine Grace A.C. Bhaktivedanta Swami Prabhupada",
    pricePerBook: 280,
    mrp: 350,
    shortDescription: "The timeless conversation between Krishna and Arjuna on duty, devotion and the self by A.C. Bhaktivedanta Swami Prabhupada.",
    fullDescription: `<p>The Bhagavad Gita is the essence of Vedic knowledge and one of the most important Upanishads in Vedic literature. Spoken by Lord Krishna to His intimate disciple Arjuna on the battlefield of Kurukshetra, it provides definitive guidance on the science of self-realisation.</p><p>Through clear explanations of karma-yoga, jnana-yoga, and bhakti-yoga, this sacred dialogue illuminates the nature of consciousness, the soul, the universe, and the Supreme Truth, providing practical principles for peaceful living and spiritual growth in everyday life.</p>`,
    coverImage: "/uploads/books/bhagavad-gita-as-it-is.png",
    language: "Hindi & English",
    binding: "Hardcover",
    allowBuy: true,
    allowDistribute: true,
    minBuyQty: 1,
    maxBuyQty: 100,
    minDistributeQty: 10,
    maxDistributeQty: 100000,
    distributionPresets: [10, 50, 100, 250, 500, 600, 700, 1000],
    gstPercent: 18,
    isActive: true,
    isFeatured: true,
    highlights: [
      "Complete original Sanskrit text with Roman transliteration",
      "Word-for-word English equivalents & lucid translation",
      "Elaborate purports by the world's foremost Vedic scholar",
      "Ideal for personal study and auspicious gifting"
    ]
  },
  {
    displayOrder: 2,
    title: "Shrimad Bhagavatam",
    slug: "shrimad-bhagavatam",
    subtitle: "The Immaculate Purana by A.C. Bhaktivedanta Swami Prabhupada",
    authorOrTranslator: "His Divine Grace A.C. Bhaktivedanta Swami Prabhupada",
    pricePerBook: 9100,
    mrp: 11000,
    shortDescription: "The spotless Purana presenting the science of Krishna and devotional surrender by A.C. Bhaktivedanta Swami Prabhupada.",
    fullDescription: `<p>Srimad Bhagavatam, known as the spotless Purana, is celebrated as the ripened fruit of the desire tree of Vedic literature. Translated and elucidated by His Divine Grace A.C. Bhaktivedanta Swami Prabhupada, it focuses entirely on transcendental devotion and glorifies the divine pastimes and attributes of the Supreme Personality of Godhead.</p><p>From the philosophical inquiries of King Pariksit and Sukadeva Goswami to the deep wisdom of devotional surrender, the Bhagavatam is a profound lighthouse guiding souls toward pure love of God and eternal joy.</p>`,
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
    gstPercent: 18,
    isActive: true,
    isFeatured: true,
    highlights: [
      "The complete spotless Purana and cream of Vedic literature",
      "Authentic Sanskrit verses, Roman transliteration and elaborate purports",
      "Immortal pastimes of Supreme Lord Sri Krishna and His pure devotees",
      "A timeless treasure for every home and spiritual institution"
    ]
  },
  {
    displayOrder: 3,
    title: "The Nectar of Devotion",
    slug: "the-nectar-of-devotion",
    subtitle: "The Complete Science of Bhakti-Yoga by A.C. Bhaktivedanta Swami Prabhupada",
    authorOrTranslator: "His Divine Grace A.C. Bhaktivedanta Swami Prabhupada",
    pricePerBook: 250,
    mrp: 320,
    shortDescription: "A summary study of Srila Rupa Goswami's Bhakti-rasamrta-sindhu, presenting the definitive science of devotional service.",
    fullDescription: `<p>The Nectar of Devotion is a summary study of Sri Rupa Goswami’s Bhakti-rasamrta-sindhu, authored by His Divine Grace A.C. Bhaktivedanta Swami Prabhupada. It systematically presents the science of bhakti-yoga—the path of divine love and devotional service to Lord Krishna.</p><p>Covering the fundamental practices of sadhana-bhakti, the symptoms of ecstatic love (bhava-bhakti), and the ultimate perfection of pure unalloyed love of God (prema-bhakti), this masterpiece serves as an indispensable handbook for anyone seeking true spiritual fulfilment.</p>`,
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
    gstPercent: 18,
    isActive: true,
    isFeatured: true,
    highlights: [
      "The definitive guidebook for the complete science of Bhakti-yoga",
      "Systematic explanation of 64 foundational devotional practices",
      "Illuminates stages of devotional development from faith to pure divine love",
      "Authorized summary study of Srila Rupa Goswami's Bhakti-rasamrta-sindhu"
    ]
  },
  {
    displayOrder: 4,
    title: "Beyond Birth & Death",
    slug: "beyond-birth-and-death",
    subtitle: "Transcendental Knowledge of Reincarnation and the Soul",
    authorOrTranslator: "His Divine Grace A.C. Bhaktivedanta Swami Prabhupada",
    pricePerBook: 45,
    mrp: 60,
    shortDescription: "A concise, illuminating guide to the science of the soul, reincarnation, and how to transcend the cycle of repeated birth and death.",
    fullDescription: `<p>Beyond Birth and Death offers clear, definitive answers to humanity's greatest mysteries: What happens to consciousness after bodily death? Is reincarnation real? How can the soul achieve eternal liberation?</p><p>Drawing from the timeless verses of the Bhagavad Gita and ancient Vedic wisdom, His Divine Grace A.C. Bhaktivedanta Swami Prabhupada reveals how by practicing simple, authentic bhakti-yoga meditation, anyone can awaken their eternal spiritual identity and transcend material suffering forever.</p>`,
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
    gstPercent: 18,
    isActive: true,
    isFeatured: true,
    highlights: [
      "The definitive introductory guide to the science of reincarnation and the soul",
      "Explains how the mind and desires shape our next destination",
      "Practical instructions on meditation and awakening eternal spiritual consciousness",
      "Direct insights drawn from the Bhagavad Gita"
    ]
  }
];

export async function seedBooks() {
  console.log("Seeding canonical books data...");
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 });
  }

  for (const item of canonicalBooks) {
    const existing = await Book.findOne({ slug: item.slug });
    if (existing) {
      console.log(`- Book already exists: ${item.title} (retaining existing admin edits)`);
    } else {
      await Book.create(item);
      console.log(`+ Created book: ${item.title} (₹${item.pricePerBook})`);
    }
  }

  // Ensure default BookPaymentSetting exists
  const paymentSetting = await BookPaymentSetting.findOne({ singletonKey: "default_book_settings" });
  if (!paymentSetting) {
    await BookPaymentSetting.create({
      singletonKey: "default_book_settings",
      upiPayeeName: "ISKCON Juhu",
      defaultGstPercent: 0,
      shippingFeeEnabled: false,
      shippingFeeAmount: 0,
      useTripPaymentDetails: true
    });
    console.log("+ Initialized default BookPaymentSetting");
  }

  console.log("Books seed completed successfully.");
}

// CLI runner
if (process.argv[1]?.endsWith("seed-books.js")) {
  seedBooks()
    .then(async () => {
      await mongoose.disconnect();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error("Error seeding books:", err);
      await mongoose.disconnect();
      process.exit(1);
    });
}
