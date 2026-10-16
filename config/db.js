const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/campusconnect');
    console.log(`[MongoDB] Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`[MongoDB] Connection Error: ${error.message}`);
    console.warn(`[MongoDB] Running without persistent database or ensure MongoDB is active on ${process.env.MONGODB_URI}`);
    // In dev, we don't necessarily exit immediately so user can see instructions
    return null;
  }
};

module.exports = connectDB;
