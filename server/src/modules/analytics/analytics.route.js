/**
 * analytics.route.js
 * HTTP surface for /api/analytics — read-only aggregates, no persistence of its own.
 */

const express = require("express");
const router = express.Router();
const requireAuth = require("../../middleware/requireAuth");
const analyticsController = require("./analytics.controller");

router.use(requireAuth);

router.get("/area-demand", analyticsController.areaDemand);         // GET /api/analytics/area-demand?areaId=&category=&windowMinutes=
router.get("/velocity-curve", analyticsController.velocityCurve);   // GET /api/analytics/velocity-curve?areaId=&category=&windowMinutes=&points=

module.exports = router;
