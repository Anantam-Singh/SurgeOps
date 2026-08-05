/**
 * backfill_baseline.js
 * Generates realistic multi-day order history for one account's own areas —
 * without this, the rule-based surge detector (engine/detectors/ruleBasedDetector.js)
 * always throws INSUFFICIENT_BASELINE, no matter how big a demand burst you
 * inject, because it has nothing from prior days to compare "current" against.
 * Only demo@surgeops.local gets this automatically from scripts/seed.js — any
 * other account (real signups, OAuth logins) starts with zero history and
 * needs this run once before surge detection can ever fire for it.
 *
 * Usage: node server/scripts/backfill_baseline.js --email=someone@example.com
 */

const dns = require("dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]);
require("dotenv").config();
const mongoose = require("mongoose");

const Area = require("../modules/areas/area.model");
const Order = require("../modules/orders/order.model");
const User = require("../modules/users/user.model");
const { buildHistoricalOrders } = require("./lib/historicalOrders");

const emailArg = process.argv.find((a) => a.startsWith("--email="));
const EMAIL = emailArg ? emailArg.split("=")[1].trim().toLowerCase() : null;

async function run() {
  if (!EMAIL) {
    console.error("Usage: node backfill_baseline.js --email=someone@example.com");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const user = await User.findOne({ email: EMAIL });
  if (!user) {
    console.error(`No account found for ${EMAIL} — they need to log in at least once first.`);
    process.exit(1);
  }

  const areas = await Area.find({ ownerId: user._id.toString() });
  if (areas.length === 0) {
    console.error(`${EMAIL} has no areas yet — register outlets first, then re-run this.`);
    process.exit(1);
  }

  const allOrders = areas.flatMap((area) => buildHistoricalOrders(area._id.toString()));
  const created = await Order.insertMany(allOrders);

  console.log(
    `Backfilled ${created.length} historical orders across ${areas.length} area(s) for ${EMAIL}: ${areas
      .map((a) => a.name)
      .join(", ")}`
  );
  console.log("Surge detection now has a real baseline — try injecting a demand burst again.");

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
