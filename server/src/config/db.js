const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]); 

const mongoose = require("mongoose");
const { MONGO_URI } = require("./env");

const connectDB = async () => {
  try {
    await mongoose.connect(MONGO_URI);

    console.log("MongoDB Connected");
  } catch (error) {
    console.error("MongoDB Connection Failed");
    console.error(error.message);
    process.exit(1);
  }
};

module.exports = connectDB;