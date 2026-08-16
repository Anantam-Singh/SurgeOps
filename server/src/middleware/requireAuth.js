/**
 * requireAuth.js
 * Verifies the JWT issued at login (see modules/auth) and attaches the
 * authenticated identity to the request. Every area/order/surge/recommendation
 * route needs this — without it, one logged-in identity's data is visible to
 * any other (the bug this middleware exists to close).
 */

const { verifyToken } = require("../modules/auth/jwt");
const AppError = require("./AppError");

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return next(new AppError("UNAUTHORIZED", "Missing bearer token", 401));
  }

  try {
    const payload = verifyToken(token);
    req.userId = payload.sub;
    req.userEmail = payload.email;
    next();
  } catch (err) {
    next(new AppError("UNAUTHORIZED", "Invalid or expired token", 401));
  }
}

module.exports = requireAuth;
