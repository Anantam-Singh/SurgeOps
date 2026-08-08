const Config = require("./config.model");

const CONFIG_TYPE = "surge_thresholds";

async function getActiveConfig() {
  const cfg = await Config.findOne({ type: CONFIG_TYPE }).lean();

  if (cfg) return cfg;

  return {
    defaults: { surgePctThreshold: 50, windowMinutes: 60 },
    byCategory: {},
    sensitivityMultipliers: { low: 1.2, medium: 1.0, high: 0.8 },
  };
}

function readCategoryThreshold(byCategory, category) {
  if (!byCategory) return undefined;

  if (typeof byCategory.get === "function") {
    return byCategory.get(category)?.surgePctThreshold;
  }

  return byCategory[category]?.surgePctThreshold;
}

function readEnrichmentMultiplier(area, category) {
  return area?.metadata?.enrichment?.categoryMultipliers?.[category]?.multiplier;
}

function effectiveThreshold(cfg, area, category) {
  const areaOverride = area?.config?.surgePctThreshold;

  const base =
    areaOverride ??
    readCategoryThreshold(cfg.byCategory, category) ??
    cfg.defaults?.surgePctThreshold ??
    Number(process.env.DEFAULT_SURGE_PCT ?? 50);

  const sensitivity = area?.config?.surgeSensitivity ?? "medium";
  const sensitivityMult = cfg.sensitivityMultipliers?.[sensitivity] ?? 1.0;

  const enrichmentMult = readEnrichmentMultiplier(area, category) ?? 1.0;

  return (base * sensitivityMult) / enrichmentMult;
}

module.exports = {
  getActiveConfig,
  effectiveThreshold,
};