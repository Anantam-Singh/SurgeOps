/**
 * area.service.js
 * All business logic + validation for areas.
 * Never builds Mongo queries directly — always goes through the repository.
 */

const areaRepository = require("./area.repository");
const AppError = require("../../middleware/AppError");

function validateGeo(geo) {
  if (
    !geo ||
    !Array.isArray(geo.coordinates) ||
    geo.coordinates.length !== 2 ||
    typeof geo.coordinates[0] !== "number" ||
    typeof geo.coordinates[1] !== "number"
  ) {
    throw new AppError(
      "VALIDATION_ERROR",
      "geo must be a GeoJSON Point with coordinates: [lng, lat]",
      400
    );
  }
}

async function createArea(payload, ownerId) {
  const { name, city, geo } = payload;

  if (!name || !city) {
    throw new AppError("VALIDATION_ERROR", "name and city are required", 400);
  }
  validateGeo(geo);

  return areaRepository.create({
    ...payload,
    ownerId,
    geo: { type: "Point", coordinates: geo.coordinates },
  });
}

async function getAreaById(id, ownerId) {
  const area = await areaRepository.findById(id);
  if (!area || area.ownerId !== ownerId) {
    throw new AppError("NOT_FOUND", "Area not found", 404);
  }
  return area;
}

/**
 * @param {object} query - { city, near } where near is "lat,lng" string from query params
 */
async function listAreas(query, ownerId) {
  const { city, near } = query;
  const filters = { ownerId, city };

  if (near) {
    const parts = near.split(",").map((n) => parseFloat(n.trim()));
    if (parts.length !== 2 || parts.some(Number.isNaN)) {
      throw new AppError(
        "VALIDATION_ERROR",
        "near must be in the format lat,lng (e.g. ?near=12.9352,77.6245)",
        400
      );
    }
    filters.near = { lat: parts[0], lng: parts[1] };
  }

  return areaRepository.findAll(filters);
}

async function updateArea(id, updates, ownerId) {
  // Confirms ownership before allowing any change — findByIdAndUpdate alone
  // would happily update another account's area if the id were guessed.
  await getAreaById(id, ownerId);

  // If geo is being updated, validate its shape before hitting the DB
  if (updates.geo) {
    validateGeo(updates.geo);
    updates.geo = { type: "Point", coordinates: updates.geo.coordinates };
  }

  const updated = await areaRepository.updateById(id, updates);
  if (!updated) {
    throw new AppError("NOT_FOUND", "Area not found", 404);
  }
  return updated;
}

/** Used by other modules (orders/surges/recommendations/analytics) to scope
 * their own queries to only the areas this account owns. */
async function getOwnedAreaIds(ownerId) {
  const areas = await areaRepository.findAll({ ownerId });
  return areas.map((a) => a._id.toString());
}

module.exports = {
  createArea,
  getAreaById,
  listAreas,
  updateArea,
  getOwnedAreaIds,
};