/**
 * errorHandler.js
 * Centralized error handler — must be mounted LAST in app.js (after routes).
 * Converts any thrown error into the standard response envelope:
 *   { success: false, data: null, error: { code, message } }
 *
 * Handles:
 *  - AppError instances (thrown deliberately from services/controllers)
 *  - Mongoose ValidationError
 *  - Mongoose duplicate key error (E11000) -> CONFLICT
 *  - Mongoose CastError (bad ObjectId) -> NOT_FOUND-ish / VALIDATION_ERROR
 *  - Anything else -> 500 UNKNOWN_ERROR
 */

const AppError = require("./AppError");

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  // Deliberately thrown, known errors
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      data: null,
      error: { code: err.code, message: err.message },
    });
  }

  // Mongoose validation errors
  if (err.name === "ValidationError") {
    const message = Object.values(err.errors)
      .map((e) => e.message)
      .join(", ");
    return res.status(400).json({
      success: false,
      data: null,
      error: { code: "VALIDATION_ERROR", message },
    });
  }

  // Mongoose duplicate key error (e.g. duplicate sku)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || "field";
    return res.status(409).json({
      success: false,
      data: null,
      error: {
        code: "CONFLICT",
        message: `Duplicate value for '${field}': ${err.keyValue?.[field]}`,
      },
    });
  }

  // Mongoose bad ObjectId cast (e.g. GET /api/products/not-a-valid-id)
  if (err.name === "CastError") {
    return res.status(400).json({
      success: false,
      data: null,
      error: { code: "VALIDATION_ERROR", message: `Invalid ${err.path}: ${err.value}` },
    });
  }

  // Fallback: unexpected/unhandled error
  console.error("Unhandled error:", err);
  return res.status(500).json({
    success: false,
    data: null,
    error: {
      code: "INTERNAL_ERROR",
      message: "Something went wrong. Please try again later.",
    },
  });
};

module.exports = errorHandler;