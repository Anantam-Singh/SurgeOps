/**
 * historicalOrders.js
 * Shared synthetic order-history generator, used by both scripts/seed.js (the
 * fixed demo account) and scripts/backfill_baseline.js (any account's own
 * areas). Produces a realistic multi-day hourly pattern — diurnal curve,
 * weekend uplift, occasional weather tags — which is what the rule-based
 * surge detector needs as a comparison baseline (engine/velocity.js requires
 * several days of same-time-of-day history before it can say "this is a
 * surge" at all) and what the ML demand forecast model trains on.
 */

const HOUR_MS = 60 * 60 * 1000;
const CATEGORIES = ["beverages", "snacks", "essentials"];

const DIURNAL_CURVE = [
  0.3, 0.2, 0.15, 0.15, 0.2, 0.35, 0.6, 0.9, 1.1, 1.0, 0.9, 0.85,
  0.9, 0.85, 0.8, 0.85, 0.95, 1.2, 1.4, 1.3, 1.1, 0.8, 0.6, 0.4,
];
const CATEGORY_BASE_RATE = { beverages: 6, snacks: 5, essentials: 4 };
const CATEGORY_SKU = { beverages: "BVG-COLA-500", snacks: "SNK-CHIPS-90", essentials: "ESS-MILK-500" };

function weekendMultiplier(date) {
  const day = date.getDay();
  return day === 0 || day === 6 ? 1.25 : 1.0;
}

function minutesAgo(mins) {
  return new Date(Date.now() - mins * 60 * 1000);
}

/**
 * @param {object} [options]
 * @param {number}  [options.historyDays=5]
 * @param {string[]} [options.categories]
 * @param {Array<{startDate: Date, endDate: Date, categoryImpacts: Record<string, number>}>}
 *   [options.festivals] — demand inside a festival window is multiplied per
 *   category and orders get a "festival" event tag (used by seed.js so the
 *   ML model's festivalMultiplier feature has real correlated signal).
 */
function buildHistoricalOrders(areaId, { historyDays = 5, categories = CATEGORIES, festivals = [] } = {}) {
  const orders = [];
  const now = Date.now();
  const totalHours = historyDays * 24;

  for (let hoursAgo = totalHours; hoursAgo >= 1; hoursAgo--) {
    const bucketEnd = new Date(now - (hoursAgo - 1) * HOUR_MS);
    const hour = bucketEnd.getHours();
    const activeFestival = festivals.find((f) => bucketEnd >= f.startDate && bucketEnd <= f.endDate);

    for (const category of categories) {
      let qty = (CATEGORY_BASE_RATE[category] ?? 5) * DIURNAL_CURVE[hour] * weekendMultiplier(bucketEnd);
      qty *= 0.8 + Math.random() * 0.4; // noise

      let weatherCondition = null;
      if (category === "beverages" && Math.random() < 0.25) {
        weatherCondition = "Clear";
        qty *= 1.3;
      }

      if (activeFestival?.categoryImpacts?.[category]) {
        qty *= activeFestival.categoryImpacts[category];
      }

      qty = Math.round(qty);
      if (qty <= 0) continue;

      const numOrders = Math.min(qty, 1 + Math.floor(Math.random() * 3));
      let remaining = qty;
      for (let i = 0; i < numOrders; i++) {
        const isLast = i === numOrders - 1;
        const orderQty = isLast ? remaining : Math.max(1, Math.round(remaining / (numOrders - i)));
        remaining -= orderQty;

        orders.push({
          areaId,
          items: [{ sku: CATEGORY_SKU[category] ?? CATEGORY_SKU.beverages, qty: orderQty, category }],
          totalAmount: orderQty * 40,
          status: "confirmed",
          eventTags: activeFestival ? ["festival"] : ["routine"],
          placedAt: new Date(bucketEnd.getTime() - Math.floor(Math.random() * 55) * 60 * 1000),
          metadata: weatherCondition ? { weatherAtOrder: { condition: weatherCondition, tempC: 30 } } : {},
        });
      }
    }
  }

  return orders;
}

function buildSurgeBurstOrders(areaId, { category = "beverages", count = 23, tags = ["burst"] } = {}) {
  const sku = CATEGORY_SKU[category] ?? CATEGORY_SKU.beverages;
  const orders = [];
  for (let i = 0; i < count; i++) {
    orders.push({
      areaId,
      items: [{ sku, qty: 4, category }],
      totalAmount: 160,
      status: "confirmed",
      eventTags: tags,
      placedAt: minutesAgo(Math.floor(Math.random() * 55)),
      metadata: { weatherAtOrder: { condition: "clear", tempC: 28 } },
    });
  }
  return orders;
}

module.exports = { CATEGORIES, CATEGORY_SKU, buildHistoricalOrders, buildSurgeBurstOrders };
