const mongoose = require("mongoose");
const { connect, disconnect } = require("mongoose");
let isConnected = false;
const clientOptions = {
  family: 4,
  serverApi: { version: "1", strict: true, deprecationErrors: true },
};
const connectMongo = async () => {
  try {
    if (isConnected) {
      console.log("MongoDB already connected");
      return mongoose.connection;
    }

    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is missing in environment variables");
    }
    const conn = await mongoose.connect(process.env.MONGO_URI, clientOptions);

    isConnected = true;
    console.log("MongoDB Connected:", conn.connection.host);

    return conn;
  } catch (error) {
    console.error("MongoDB Connection Error:", error.message);
    throw error;
  }
};

const disconnectMongo = async () => {
  try {
    await mongoose.disconnect();
    isConnected = false;
    console.log("MongoDB Disconnected");
  } catch (error) {
    console.error("MongoDB Disconnect Error:", error.message);
    throw error;
  }
};

const getMongoConnectionStatus = () => {
  return {
    isConnected,
    state: mongoose.connection.readyState, 
    // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
  };
};

module.exports = {
  connectMongo,
  disconnectMongo,
  getMongoConnectionStatus,
};