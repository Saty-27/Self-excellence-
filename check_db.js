const mongoose = require("mongoose");
const { PageSection } = require("./backend/src/models");

async function run() {
  await mongoose.connect("mongodb://localhost:27017/iskcon-juhu-ipp");
  const items = await PageSection.find().lean();
  console.log("ITEMS IN DB:", JSON.stringify(items, null, 2));
  await mongoose.disconnect();
}

run().catch(console.error);
