const mongoose = require("mongoose");
const { Banner } = require("./src/models");

async function run() {
  await mongoose.connect("mongodb://localhost:27017/iskcon-juhu-ipp");
  const items = await Banner.find().lean();
  console.log("BANNERS IN DB:", JSON.stringify(items, null, 2));
  await mongoose.disconnect();
}

run().catch(console.error);
