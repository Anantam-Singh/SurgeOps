// Must load first: populates process.env from .env before any other module
// (e.g. modules/auth/passport.js) reads it at require-time.
const { PORT } = require("./config/env");

const app = require("./app");
const connectDB = require("./config/db");
const { startRecalibrationScheduler } = require("./engine/enrichers/scheduler");
const { startModelTrainingScheduler } = require("./engine/ml/trainingScheduler");
const demandForecastModel = require("./engine/ml/demandForecastModel");

const startServer = async () => {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });

  startRecalibrationScheduler();
  startModelTrainingScheduler();

  demandForecastModel
    .trainFromDatabase()
    .then((status) => console.log(`Demand forecast model trained — sampleCount=${status.sampleCount}`))
    .catch((err) => console.error("Initial demand forecast model training failed:", err.message));
};

startServer();