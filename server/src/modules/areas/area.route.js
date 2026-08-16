/**
 * area.route.js
 * HTTP surface for /api/areas (see doc §5.1)
 * Note: no DELETE endpoint for areas per the doc's contract.
 * requireAuth on every route — areas are per-account (see area.model.js ownerId).
 */

const express = require("express");
const router = express.Router();
const requireAuth = require("../../middleware/requireAuth");
const areaController = require("./area.controller");

router.use(requireAuth);

router.get("/", areaController.listAreas);       // GET /api/areas?city=&near=lat,lng
router.get("/:id", areaController.getArea);       // GET /api/areas/:id
router.post("/", areaController.createArea);      // POST /api/areas
router.patch("/:id", areaController.updateArea);  // PATCH /api/areas/:id

module.exports = router;
