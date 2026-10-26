import "dotenv/config";
import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { ObjectId } from "mongodb";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function reviveMongoTypes(obj) {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(reviveMongoTypes);
  if (typeof obj === "object") {
    // Check for ObjectId string
    if (obj.$oid && typeof obj.$oid === "string") {
      return new ObjectId(obj.$oid);
    }
    // Check for Date string
    if (obj.$date && typeof obj.$date === "string") {
      return new Date(obj.$date);
    }

    const revived = {};
    for (const [k, v] of Object.entries(obj)) {
      if (k === "_id" && typeof v === "string" && /^[0-9a-fA-F]{24}$/.test(v)) {
        revived[k] = new ObjectId(v);
      } else if ((k === "createdAt" || k === "updatedAt" || k === "date" || k === "startDate" || k === "endDate") && typeof v === "string" && !isNaN(Date.parse(v))) {
        revived[k] = new Date(v);
      } else {
        revived[k] = reviveMongoTypes(v);
      }
    }
    return revived;
  }
  return obj;
}

export async function importSelfExcellenceSeed() {
  const seedFile = path.join(__dirname, "..", "data", "self-excellence-seed.json");
  if (!fs.existsSync(seedFile)) {
    throw new Error(`Seed file not found at: ${seedFile}`);
  }

  const raw = fs.readFileSync(seedFile, "utf8");
  const data = JSON.parse(raw);

  const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/self-excellence";
  console.log(`Connecting to MongoDB: ${mongoUri.replace(/:([^:@]{3,})@/, ":***@")}`);
  await mongoose.connect(mongoUri);

  const db = mongoose.connection.db;
  console.log("Connected to MongoDB. Beginning database seed from local export...\n");

  let totalCollections = 0;
  let totalDocs = 0;

  for (const [colName, docs] of Object.entries(data)) {
    if (!Array.isArray(docs) || docs.length === 0) continue;

    const col = db.collection(colName);
    const revivedDocs = docs.map(reviveMongoTypes);

    for (const doc of revivedDocs) {
      if (doc._id) {
        await col.replaceOne({ _id: doc._id }, doc, { upsert: true });
      } else {
        await col.insertOne(doc);
      }
    }

    totalCollections++;
    totalDocs += revivedDocs.length;
    console.log(`+ Seeded ${revivedDocs.length} docs into "${colName}"`);
  }

  console.log(`\n============================================================`);
  console.log(`Self-Excellence database seeding complete!`);
  console.log(`Collections: ${totalCollections} | Total Documents: ${totalDocs}`);
  console.log(`============================================================\n`);

  await mongoose.disconnect();
}

// CLI runner
if (process.argv[1]?.endsWith("seed-self-excellence.js")) {
  importSelfExcellenceSeed()
    .then(() => {
      console.log("Seed process exited with code 0.");
      process.exit(0);
    })
    .catch((err) => {
      console.error("Seed failed:", err);
      process.exit(1);
    });
}
