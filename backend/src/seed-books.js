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
    title: "Shiv Puran",
    slug: "shiv-puran",
    subtitle: "Sacred Glories and Teachings of Lord Shiva",
    pricePerBook: 200,
    mrp: 250,
    shortDescription: "The glories, pastimes and teachings related to Lord Shiva.",
    fullDescription: `<p>The Shiv Puran is one of the eighteen major Puranas, describing the cosmic role, divine attributes, and profound pastimes of Lord Shiva. It offers prayers, meditations, and philosophical insights into the harmony of creation, sustenance, and dissolution.</p><p>Through narratives of devotion, penance, and grace, this sacred text emphasizes humility, self-control, and unalloyed reverence for the divine, inspiring readers to cultivate spiritual discipline and inner peace.</p>`,
    coverImage: img("photo-1506126613408-eca07ce68773"),
    language: "Hindi & English",
    binding: "Hardcover",
    allowBuy: true,
    allowDistribute: true,
    minBuyQty: 1,
    maxBuyQty: 100,
    minDistributeQty: 10,
    maxDistributeQty: 100000,
    distributionPresets: [10, 50, 100, 250, 500, 600, 700, 1000],
    gstPercent: 0,
    isActive: true,
    isFeatured: true,
    highlights: [
      "Complete narratives and symbolic significance of Mahadeva",
      "Inspiring stories of unwavering devotion and meditation",
      "Includes sacred hymns and contemplative verses"
    ]
  },
  {
    displayOrder: 4,
    title: "Garuda Puran",
    slug: "garuda-puran",
    subtitle: "Teachings on Karma, Dharma, and the Soul's Journey",
    pricePerBook: 200,
    mrp: 250,
    shortDescription: "Teachings on life, karma, duty and the journey of the soul.",
    fullDescription: `<p>The Garuda Puran is a sacred Vaishnava text framed as a dialogue between Lord Vishnu and His eternal carrier, Garuda. It addresses fundamental questions regarding dharma, the consequences of actions, the transmigration of the soul, and liberation from material bondage.</p><p>With practical ethical guidance for daily life and spiritual rites, it encourages ethical integrity, compassionate conduct, and mindful awareness of life's ultimate destination.</p>`,
    coverImage: img("photo-1514222134-b57cbb8ce073"),
    language: "Hindi & English",
    binding: "Hardcover",
    allowBuy: true,
    allowDistribute: true,
    minBuyQty: 1,
    maxBuyQty: 100,
    minDistributeQty: 10,
    maxDistributeQty: 100000,
    distributionPresets: [10, 50, 100, 250, 500, 600, 700, 1000],
    gstPercent: 0,
    isActive: true,
    isFeatured: true,
    highlights: [
      "In-depth discourse between Lord Vishnu and Garuda",
      "Clarifies the law of karma, liberation and moral conduct",
      "Valuable guide for understanding life, transition and devotion"
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
