/**
 * area.model.js
 * See doc §2.4 — Areas Collection
 */

const mongoose = require("mongoose");

const geoPointSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["Point"], default: "Point" },
    coordinates: {
      type: [Number], // [lng, lat]
      required: true,
      validate: {
        validator: (v) => Array.isArray(v) && v.length === 2,
        message: "coordinates must be [lng, lat]",
      },
    },
  },
  { _id: false }
);

const capacitySchema = new mongoose.Schema(
  {
    maxUnits: { type: Number, default: 0 },
    currentUnits: { type: Number, default: 0 },
    reorderBufferPct: { type: Number, default: 15 },
  },
  { _id: false }
);

const categoryStockSchema = new mongoose.Schema(
  {
    maxUnits: { type: Number, default: 0 },
    currentUnits: { type: Number, default: 0 },
  },
  { _id: false }
);

const areaConfigSchema = new mongoose.Schema(
  {
    surgeSensitivity: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    operatingHours: {
      open: { type: String, default: "00:00" },
      close: { type: String, default: "23:59" },
    },
  },
  { _id: false }
);

const areaSchema = new mongoose.Schema(
  {
    // The account that owns this fulfillment center — every read/write in the
    // areas/orders/surges/recommendations/analytics modules is scoped to this,
    // so one account's dark-store network is never visible to another's.
    ownerId: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true },
    city: { type: String, required: true, index: true },
    geo: { type: geoPointSchema, required: true },
    capacity: { type: capacitySchema, default: () => ({}) },
    categoryStock: { type: Map, of: categoryStockSchema, default: {} },
    neighbors: { type: [String], default: [] }, // array of area _ids
    config: { type: areaConfigSchema, default: () => ({}) },
    schemaVersion: { type: Number, default: 1 },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  {
    strict: false,
    timestamps: true,
  }
);

// 2dsphere index for $near queries on geo — required by §2.4
areaSchema.index({ geo: "2dsphere" });

module.exports = mongoose.model("Area", areaSchema);