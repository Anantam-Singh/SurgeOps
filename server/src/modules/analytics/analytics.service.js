/**
 * analytics.service.js
 * Read-only aggregates over live order data for the dashboard/analytics UI.
 * Reuses engine/velocity.js (same math the surge detector uses) so these
 * numbers always agree with what actually triggers an alert.
 */

const areaRepository = require("../areas/area.repository");
const areaService = require("../areas/area.service");
const productRepository = require("../products/product.repository");
const surgeService = require("../surges/surge.service");
const AppError = require("../../middleware/AppError");
const { getActiveConfig } = require("../../config/thresholds");
const {
  calculateCurrentDemand,
  calculateBaselineDemand,
  calculateSurgePercentage,
} = require("../../engine/velocity");

async function resolveCategories() {
  const { items } = await productRepository.findAll({}, { page: 1, limit: 100 });
  const categories = [...new Set(items.map((p) => p.category))];
  return categories.length ? categories : ["beverages", "snacks", "essentials"];
}

async function getAreaDemand({ areaId, category, windowMinutes, ownerId } = {}) {
  const cfg = await getActiveConfig();
  const resolvedWindow = Number(windowMinutes) || cfg.defaults?.windowMinutes || 60;

  const areas = areaId
    ? [await areaService.getAreaById(areaId, ownerId)] // throws NOT_FOUND if not theirs
    : await areaRepository.findAll({ ownerId });

  const categories = category ? [category] : await resolveCategories();

  // Each area's order fetch is an independent round-trip to Mongo — running them
  // sequentially means total latency scales with the number of areas. Fetching
  // in parallel bounds it to the slowest single fetch instead (matters a lot on
  // a remote Atlas cluster: this endpoint is polled every ~20s by the frontend).
  const perAreaResults = await Promise.all(
    areas.map(async (area) => {
      const orders = await surgeService.fetchRelevantOrders(area._id.toString(), resolvedWindow);

      return categories.map((cat) => {
        const currentDemand = calculateCurrentDemand({ orders, category: cat, windowMinutes: resolvedWindow });
        const { baseline } = calculateBaselineDemand({ orders, category: cat, windowMinutes: resolvedWindow });

        // A brand-new area/category has no baseline to divide by — calculateSurgePercentage
        // returns null, which would otherwise flatten to a misleading 0% even when there's
        // real live demand (e.g. a just-registered outlet's very first orders). Surface that
        // as a clear "this needs attention" signal instead of hiding it as "nothing happening".
        // (Display-only: the actual alerting/detection logic in ruleBasedDetector.js is
        // intentionally stricter and correctly withholds judgment without a real baseline.)
        const surgePercentage =
          currentDemand > 0 && !baseline
            ? 999
            : Math.max(0, Math.round(calculateSurgePercentage(currentDemand, baseline) ?? 0));

        return {
          areaId: area._id.toString(),
          category: cat,
          baselineDemand: baseline ?? 0,
          currentDemand,
          surgePercentage,
        };
      });
    })
  );

  return perAreaResults.flat();
}

function sumQtyForCategory(orders, category) {
  let total = 0;
  for (const order of orders) {
    for (const item of order.items) {
      if (item.category === category) total += item.qty;
    }
  }
  return total;
}

async function getVelocityCurve({ areaId, category, windowMinutes, points, ownerId } = {}) {
  if (!areaId) {
    throw new AppError("VALIDATION_ERROR", "areaId is required", 400);
  }
  await areaService.getAreaById(areaId, ownerId); // throws NOT_FOUND if not theirs

  const cfg = await getActiveConfig();
  const resolvedWindow = Number(windowMinutes) || cfg.defaults?.windowMinutes || 60;
  const resolvedCategory = category || (await resolveCategories())[0];
  const numPoints = Math.min(Math.max(Number(points) || 7, 2), 30);

  const orders = await surgeService.fetchRelevantOrders(areaId, resolvedWindow * numPoints);
  const referenceTime = new Date();
  const windowMs = resolvedWindow * 60 * 1000;

  const history = [];
  for (let i = numPoints - 1; i >= 0; i--) {
    const end = new Date(referenceTime.getTime() - i * windowMs);
    const start = new Date(end.getTime() - windowMs);
    const bucketOrders = orders.filter((o) => o.placedAt >= start && o.placedAt < end);
    history.push(sumQtyForCategory(bucketOrders, resolvedCategory));
  }

  const current = history[history.length - 1] ?? 0;
  const baselineSamples = history.slice(0, -1);
  const baseline = baselineSamples.length
    ? Math.round(baselineSamples.reduce((a, b) => a + b, 0) / baselineSamples.length)
    : current;

  return {
    areaId,
    category: resolvedCategory,
    windowMinutes: resolvedWindow,
    baseline,
    current,
    history,
  };
}

module.exports = { getAreaDemand, getVelocityCurve };
