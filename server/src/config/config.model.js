/**
 * config.model.js
 * See doc §2.8 — Config Collection ("no hardcoded thresholds" store)
 * Read by engine/detectors/ruleBasedDetector.js via effectiveThreshold().
 */

const mongoose = require("mongoose");

const categoryThresholdSchema = new mongoose.Schema(
  {
    surgePctThreshold: { type: Number, required: true },
  },
  { _id: false }
);

const configSchema = new mongoose.Schema(
  {
    type: { type: String, required: true, default: "surge_thresholds", index: true },
    defaults: {
      surgePctThreshold: { type: Number, default: 50 },
      windowMinutes: { type: Number, default: 60 },
    },
    byCategory: {
      type: Map,
      of: categoryThresholdSchema,
      default: {},
    },
    sensitivityMultipliers: {
      low: { type: Number, default: 1.2 },
      medium: { type: Number, default: 1.0 },
      high: { type: Number, default: 0.8 },
    },
  },
  {
    strict: false,
    timestamps: { createdAt: false, updatedAt: true },
  }
);

module.exports = mongoose.model("Config", configSchema);