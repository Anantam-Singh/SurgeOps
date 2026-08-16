/**
 * requestLogger.js
 * Simple request logging middleware.
 * Logs method, path, status code, and response time for every request.
 */

const requestLogger = (req, res, next) => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    const timestamp = new Date().toISOString();
    console.log(
      `[${timestamp}] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`
    );
  });

  next();
};

module.exports = requestLogger;