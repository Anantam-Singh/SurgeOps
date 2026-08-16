/**
 * AppError.js
 * Custom error class so services/controllers can throw errors with a
 * known HTTP status + error code, matching the standard error model (§5.3).
 *
 * Usage:
 *   throw new AppError("NOT_FOUND", "Product not found", 404);
 *   throw new AppError("VALIDATION_ERROR", "sku is required", 400);
 */

class AppError extends Error {
  constructor(code, message, statusCode = 500) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;