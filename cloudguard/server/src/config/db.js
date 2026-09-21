const mongoose = require('mongoose');

let isDbConnected = false;

/**
 * Connects to MongoDB.
 * @param {string} [uri] Optional URI override.
 * @returns {Promise<boolean>} Whether connection succeeded.
 */
async function connectDB(uri) {
  const mongoUri = uri || process.env.MONGODB_URI || 'mongodb://localhost:27017/cloudguard';

  if (mongoose.connection.readyState === 1) {
    isDbConnected = true;
    return true;
  }

  try {
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 2000 // Fast fail for fallback if local Mongo is not running
    });
    isDbConnected = true;
    console.log(`MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
    return true;
  } catch (err) {
    isDbConnected = false;
    if (process.env.NODE_ENV !== 'test') {
      console.warn(`MongoDB not available at ${mongoUri}. Operating in fallback mode. (${err.message})`);
    }
    return false;
  }
}

/**
 * Disconnects from MongoDB (useful for test teardown).
 */
async function disconnectDB() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    isDbConnected = false;
  }
}

/**
 * Checks if MongoDB is currently connected.
 * @returns {boolean}
 */
function isConnected() {
  return isDbConnected || mongoose.connection.readyState === 1;
}

module.exports = {
  connectDB,
  disconnectDB,
  isConnected
};
