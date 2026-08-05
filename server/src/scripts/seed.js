const dns = require("dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]);

require("dotenv").config();
const mongoose = require("mongoose");

const Area = require("../modules/areas/area.model");
const Product = require("../modules/products/product.model");
const Order = require("../modules/orders/order.model");
const Config = require("../config/config.model");
const SurgeAlert = require("../modules/surges/surgeAlert.model");
const Festival = require("../modules/events/festival.model");
const User = require("../modules/users/user.model");
const { buildHistoricalOrders, buildSurgeBurstOrders } = require("./lib/historicalOrders");

const MONGO_URI = process.env.MONGO_URI;
const RESET = process.argv.includes("--reset");

// Areas are per-account (see area.model.js ownerId). Seeded demo data belongs
// to this fixed demo identity rather than to whoever happens to run the seed
// script — sign in with this email (passwordless, see POST /api/auth/email)
// to see it. Every other account starts empty and adds its own outlets.
const DEMO_EMAIL = "demo@surgeops.local";

const HISTORY_DAYS = 5;

const AREAS = [
  {
    name: "Koramangala",
    city: "Bengaluru",
    geo: { type: "Point", coordinates: [77.6245, 12.9352] },
    capacity: { maxUnits: 20000, currentUnits: 14200, reorderBufferPct: 15 },
    categoryStock: {
      beverages: { maxUnits: 5000, currentUnits: 400 }, // deep deficit -> drives the surge demo
      snacks: { maxUnits: 4000, currentUnits: 2400 },
      essentials: { maxUnits: 4500, currentUnits: 3000 },
    },
    config: { surgeSensitivity: "high" },
  },
  {
    name: "HSR Layout",
    city: "Bengaluru",
    geo: { type: "Point", coordinates: [77.6412, 12.9121] },
    capacity: { maxUnits: 18000, currentUnits: 16500, reorderBufferPct: 15 },
    categoryStock: {
      beverages: { maxUnits: 5000, currentUnits: 4200 },
      snacks: { maxUnits: 4000, currentUnits: 3600 },
      essentials: { maxUnits: 4500, currentUnits: 4000 },
    },
    config: { surgeSensitivity: "medium" },
  },
  {
    name: "Indiranagar",
    city: "Bengaluru",
    geo: { type: "Point", coordinates: [77.6408, 12.9784] },
    capacity: { maxUnits: 15000, currentUnits: 9800, reorderBufferPct: 15 },
    categoryStock: {
      beverages: { maxUnits: 5000, currentUnits: 3800 },
      snacks: { maxUnits: 4000, currentUnits: 3400 },
      essentials: { maxUnits: 4500, currentUnits: 3600 },
    },
    config: { surgeSensitivity: "medium" },
  },
];

const PRODUCTS = [
  { sku: "BVG-COLA-500", name: "Cola 500ml", category: "beverages", subCategory: "carbonated", unitPrice: 40, tags: ["cold-drink", "summer", "match-day"] },
  { sku: "BVG-JUICE-1L", name: "Orange Juice 1L", category: "beverages", subCategory: "juice", unitPrice: 90, tags: ["breakfast"] },
  { sku: "SNK-CHIPS-90", name: "Potato Chips 90g", category: "snacks", subCategory: "chips", unitPrice: 20, tags: ["match-day"] },
  { sku: "SNK-NAMKEEN-150", name: "Namkeen Mix 150g", category: "snacks", subCategory: "namkeen", unitPrice: 45, tags: [] },
  { sku: "ESS-MILK-500", name: "Milk 500ml", category: "essentials", subCategory: "dairy", unitPrice: 30, tags: ["daily"], perishable: true },
  { sku: "ESS-BREAD-400", name: "Bread Loaf 400g", category: "essentials", subCategory: "bakery", unitPrice: 45, tags: ["daily"], perishable: true },
];

// Diwali festival window straddles "now" so recent order buckets fall inside it —
// gives the ML model's festivalMultiplier feature a real (not synthetic-only) signal.
const FESTIVAL_START = new Date(Date.now() - 12 * 60 * 60 * 1000);
const FESTIVAL_END = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
const FESTIVAL_CATEGORY_IMPACTS = { snacks: 2.5, beverages: 1.5 };

const FESTIVALS = [
  {
    name: "Diwali",
    city: "Bengaluru",
    startDate: FESTIVAL_START,
    endDate: FESTIVAL_END,
    categoryImpacts: [
      { category: "snacks", multiplier: FESTIVAL_CATEGORY_IMPACTS.snacks },
      { category: "beverages", multiplier: FESTIVAL_CATEGORY_IMPACTS.beverages },
    ],
  },
];

async function seedConfig() {
  await Config.findOneAndUpdate(
    { type: "surge_thresholds" },
    {
      type: "surge_thresholds",
      defaults: { surgePctThreshold: 50, windowMinutes: 60 },
      byCategory: {
        beverages: { surgePctThreshold: 60 },
        snacks: { surgePctThreshold: 55 },
        essentials: { surgePctThreshold: 40 },
      },
      sensitivityMultipliers: { low: 1.2, medium: 1.0, high: 0.8 },
    },
    { upsert: true, returnDocument: "after" }
  );
}

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB");

  if (RESET) {
    await Promise.all([
      Area.deleteMany({}),
      Product.deleteMany({}),
      Order.deleteMany({}),
      Config.deleteMany({}),
      SurgeAlert.deleteMany({}),
      Festival.deleteMany({}),
    ]);
    console.log("Cleared existing collections");
  }

  const demoUser = await User.findOneAndUpdate(
    { provider: "email", providerId: DEMO_EMAIL },
    { $set: { email: DEMO_EMAIL, name: "Demo Account" } },
    { returnDocument: "after", upsert: true, setDefaultsOnInsert: true }
  );
  console.log(`Demo account ready: ${DEMO_EMAIL} (sign in with this email to see the seeded data)`);

  const areasWithOwner = AREAS.map((area) => ({ ...area, ownerId: demoUser._id.toString() }));
  const createdAreas = await Area.insertMany(areasWithOwner);
  console.log(`Seeded ${createdAreas.length} areas`);

  const createdProducts = await Product.insertMany(PRODUCTS);
  console.log(`Seeded ${createdProducts.length} products`);

  const koramangala = createdAreas.find((a) => a.name === "Koramangala");

  const generatorFestivals = [
    { startDate: FESTIVAL_START, endDate: FESTIVAL_END, categoryImpacts: FESTIVAL_CATEGORY_IMPACTS },
  ];
  const allOrders = createdAreas.flatMap((area) =>
    buildHistoricalOrders(area._id.toString(), { historyDays: HISTORY_DAYS, festivals: generatorFestivals })
  );
  // Explicit acute burst layered on top of the background history — guarantees a
  // live, demoable surge for Koramangala/beverages regardless of random noise.
  allOrders.push(
    ...buildSurgeBurstOrders(koramangala._id.toString(), { tags: ["cricket-match", "evening-peak"] })
  );

  const createdOrders = await Order.insertMany(allOrders);
  console.log(
    `Seeded ${createdOrders.length} orders (${HISTORY_DAYS} days of history x ${createdAreas.length} areas, plus a live surge burst for Koramangala)`
  );

  await seedConfig();
  console.log("Seeded config thresholds");

  await Festival.insertMany(FESTIVALS);
  console.log("Seeded festivals");

  await mongoose.disconnect();
  console.log("Done. Run with --reset to wipe and reseed.");
}

run().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
