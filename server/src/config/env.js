require("dotenv").config();

module.exports = {
  PORT: process.env.PORT || 5000,
  MONGO_URI: process.env.MONGO_URI,
  DEFAULT_SURGE_PCT: process.env.DEFAULT_SURGE_PCT || 50,
  AI_PROVIDER: process.env.AI_PROVIDER,
  AI_MODEL: process.env.AI_MODEL,
  OPENAI_KEY: process.env.OPENAI_KEY,
  OPENWEATHER_API_KEY: process.env.OPENWEATHER_API_KEY,
  RECALIBRATION_CRON: process.env.RECALIBRATION_CRON,
};