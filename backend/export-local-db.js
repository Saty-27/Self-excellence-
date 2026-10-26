import "dotenv/config";
import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const collectionsToExport = [
  "users",
  "courses",
  "lessons",
  "coursecontents",
  "books",
  "bookpaymentsettings",
  "upcomingclasses",
  "testimonials",
  "journeys",
  "pilgrimages",
  "blogs",
  "videoblogs",
  "imagegalleries",
  "videogalleries",
  "preachers",
  "benefits",
  "herobanners",
  "sitesettings",
  "footersettings",
  "pagesections",
  "aboutpagesections",
  "contactsettings",
  "galleryitems",
  "navigationitems",
  "featurehighlights",
  "targetaudiences",
  "producttypes",
  "categories",
  "brands",
  "collections",
  "products",
  "services"
];

async function exportData() {
  await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/self-excellence");
  console.log("Connected to MongoDB for export...");

  const data = {};
  const db = mongoose.connection.db;

  for (const colName of collectionsToExport) {
    try {
      const docs = await db.collection(colName).find({}).toArray();
      data[colName] = docs;
      console.log(`Exported ${docs.length} docs from ${colName}`);
    } catch (err) {
      console.warn(`Could not export ${colName}:`, err.message);
      data[colName] = [];
    }
  }

  const outDir = path.join(__dirname, "data");
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const outPath = path.join(outDir, "self-excellence-seed.json");
  fs.writeFileSync(outPath, JSON.stringify(data, null, 2), "utf8");
  console.log(`\nSuccessfully exported local database to: ${outPath} (${(fs.statSync(outPath).size / 1024).toFixed(1)} KB)`);

  await mongoose.disconnect();
}

exportData().catch((err) => {
  console.error("Export error:", err);
  process.exit(1);
});
