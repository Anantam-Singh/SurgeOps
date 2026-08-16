const analyticsService = require("./analytics.service");

// req.userId comes from requireAuth (see analytics.route.js) — every call here is scoped to it.

async function areaDemand(req, res, next) {
  try {
    const { areaId, category, windowMinutes } = req.query;
    const data = await analyticsService.getAreaDemand({ areaId, category, windowMinutes, ownerId: req.userId });
    res.status(200).json({ success: true, data, error: null });
  } catch (err) {
    next(err);
  }
}

async function velocityCurve(req, res, next) {
  try {
    const { areaId, category, windowMinutes, points } = req.query;
    const data = await analyticsService.getVelocityCurve({
      areaId,
      category,
      windowMinutes,
      points,
      ownerId: req.userId,
    });
    res.status(200).json({ success: true, data, error: null });
  } catch (err) {
    next(err);
  }
}

module.exports = { areaDemand, velocityCurve };
