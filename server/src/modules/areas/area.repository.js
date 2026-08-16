/**
 * area.repository.js
 * ONLY this file touches Mongoose/MongoDB for the areas module.
 */

const Area = require("./area.model");

async function create(data) {
  return Area.create(data);
}

async function findById(id) {
  return Area.findById(id);
}

/**
 * @param {object} filters - { ownerId, city, near: { lat, lng } }
 */
async function findAll(filters = {}) {
  const query = {};

  if (filters.ownerId) query.ownerId = filters.ownerId;
  if (filters.city) query.city = filters.city;

  if (filters.near) {
    // Uses the 2dsphere index on `geo` — closest areas first
    query.geo = {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: [filters.near.lng, filters.near.lat], // GeoJSON is [lng, lat]
        },
      },
    };
  }

  return Area.find(query);
}

async function updateById(id, updates) {
  return Area.findByIdAndUpdate(id, updates, {
     returnDocument: "after",
    runValidators: true,
  });
}

module.exports = {
  create,
  findById,
  findAll,
  updateById,
};