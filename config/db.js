import mongoose from "mongoose";

let isConnected = false;

/**
 * ServDial DB Connection Layer
 * - prevents duplicate connections
 * - production-safe retry behavior
 */
const connectDB = async () => {
  try {
    if (isConnected) {
      console.log("⚡ MongoDB already connected, skipping reconnect");
      return;
    }

    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI not defined in environment variables");
    }

    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      maxPoolSize: 20,
    });

    isConnected = conn.connections[0].readyState === 1;

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error("❌ MongoDB Connection Failed:", error.message);

    // IMPORTANT: fail fast for backend stability
    process.exit(1);
  }
};

export default connectDB;