import "dotenv/config";
import mongoose from "mongoose";
import { Book, BookOrder, BookPaymentSetting, BookAuditLog } from "../models.js";

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/self-excellence";

export async function up() {
  console.log("Running migration 001_create_books_feature (UP)...");
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 });
  }

  // Create indexes for Books
  await Book.createIndexes();
  console.log("✓ Created indexes for Book collection");

  // Create indexes for BookOrder
  await BookOrder.createIndexes();
  console.log("✓ Created indexes for BookOrder collection");

  // Create indexes for BookPaymentSetting
  await BookPaymentSetting.createIndexes();
  console.log("✓ Created indexes for BookPaymentSetting collection");

  // Create indexes for BookAuditLog
  await BookAuditLog.createIndexes();
  console.log("✓ Created indexes for BookAuditLog collection");

  // Ensure singleton default payment setting exists
  const existingSetting = await BookPaymentSetting.findOne({ singletonKey: "default_book_settings" });
  if (!existingSetting) {
    await BookPaymentSetting.create({
      singletonKey: "default_book_settings",
      upiPayeeName: "ISKCON Juhu",
      defaultGstPercent: 0,
      shippingFeeEnabled: false,
      shippingFeeAmount: 0,
      useTripPaymentDetails: true
    });
    console.log("✓ Initialized default BookPaymentSetting record");
  }

  console.log("Migration 001_create_books_feature UP completed successfully.");
}

export async function down() {
  console.log("Running migration 001_create_books_feature (DOWN / ROLLBACK)...");
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 });
  }

  const db = mongoose.connection.db;

  const collections = await db.listCollections().toArray();
  const names = collections.map((c) => c.name);

  if (names.includes("books")) {
    await db.collection("books").drop();
    console.log("✓ Dropped books collection");
  }
  if (names.includes("bookorders")) {
    await db.collection("bookorders").drop();
    console.log("✓ Dropped bookorders collection");
  }
  if (names.includes("bookpaymentsettings")) {
    await db.collection("bookpaymentsettings").drop();
    console.log("✓ Dropped bookpaymentsettings collection");
  }
  if (names.includes("bookauditlogs")) {
    await db.collection("bookauditlogs").drop();
    console.log("✓ Dropped bookauditlogs collection");
  }

  console.log("Migration 001_create_books_feature DOWN completed successfully.");
}

// CLI runner
if (process.argv[1]?.endsWith("001_create_books_feature.js")) {
  const action = (process.argv[2] || "up").toLowerCase();
  (async () => {
    try {
      if (action === "down") {
        await down();
      } else {
        await up();
      }
      await mongoose.disconnect();
      process.exit(0);
    } catch (err) {
      console.error("Migration error:", err);
      await mongoose.disconnect();
      process.exit(1);
    }
  })();
}
