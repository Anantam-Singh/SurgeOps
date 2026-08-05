/**
 * One-time, non-destructive migration: assigns any Area created before the
 * ownerId field existed to the fixed demo account (demo@surgeops.local),
 * instead of leaving them permanently orphaned/invisible. Safe to re-run —
 * only touches areas that don't already have an ownerId.
 */
const dns = require("dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]);
require("dotenv").config();
const mongoose = require("mongoose");

const Area = require("../modules/areas/area.model");
const User = require("../modules/users/user.model");

const DEMO_EMAIL = "demo@surgeops.local";

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const demoUser = await User.findOneAndUpdate(
    { provider: "email", providerId: DEMO_EMAIL },
    { $set: { email: DEMO_EMAIL, name: "Demo Account" } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  console.log(`Demo account: ${DEMO_EMAIL} (id ${demoUser._id})`);

  const result = await Area.updateMany(
    { ownerId: { $exists: false } },
    { $set: { ownerId: demoUser._id.toString() } }
  );
  console.log(`Assigned ${result.modifiedCount} previously-orphaned area(s) to the demo account.`);

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
