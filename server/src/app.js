const express = require("express");
const cors = require("cors");
const passport = require("./modules/auth/passport");
const errorHandler = require("./middleware/errorHandler");
const requestLogger = require("./middleware/requestLogger");

const app = express();

app.use(cors());
app.use(express.json());
app.use(requestLogger);
app.use(passport.initialize());

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Surge Demand Detection Backend Running",
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Surge Demand Detection Backend Running",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/products", require("./modules/products/product.route"));
app.use("/api/areas", require("./modules/areas/area.route"));
app.use("/api/orders", require("./modules/orders/order.route"));
app.use("/api/surges", require("./modules/surges/surge.route"));
app.use("/api/recommendations", require("./modules/recommendations/recommendation.route"));
app.use("/api/enrichment", require("./modules/enrichment/enrichment.route"));
app.use("/api/analytics", require("./modules/analytics/analytics.route"));
app.use("/api/ml", require("./modules/ml/ml.route"));
app.use("/api/auth", require("./modules/auth/auth.route"));

app.use((req, res) => {
  res.status(404).json({
    success: false,
    data: null,
    error: { code: "NOT_FOUND", message: "Route not found" },
  });
});

app.use(errorHandler);

module.exports = app;