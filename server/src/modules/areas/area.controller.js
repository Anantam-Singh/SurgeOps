/**
 * area.controller.js
 * Request/response translation ONLY.
 * No database access, no business logic — delegates entirely to the service.
 * req.userId comes from requireAuth (see area.route.js) — every call here is scoped to it.
 */

const areaService = require("./area.service");

async function createArea(req, res, next) {
  try {
    const area = await areaService.createArea(req.body, req.userId);
    res.status(201).json({ success: true, data: area, error: null });
  } catch (err) {
    next(err);
  }
}

async function getArea(req, res, next) {
  try {
    const area = await areaService.getAreaById(req.params.id, req.userId);
    res.status(200).json({ success: true, data: area, error: null });
  } catch (err) {
    next(err);
  }
}

async function listAreas(req, res, next) {
  try {
    const { city, near } = req.query;
    const areas = await areaService.listAreas({ city, near }, req.userId);
    res.status(200).json({ success: true, data: areas, error: null });
  } catch (err) {
    next(err);
  }
}

async function updateArea(req, res, next) {
  try {
    const area = await areaService.updateArea(req.params.id, req.body, req.userId);
    res.status(200).json({ success: true, data: area, error: null });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createArea,
  getArea,
  listAreas,
  updateArea,
};
