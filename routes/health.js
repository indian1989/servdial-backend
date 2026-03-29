import express from "express";
import mongoose from "mongoose";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const dbState = mongoose.connection.readyState;

    res.json({
      status: "OK",
      dbConnected: dbState === 1,
      env: process.env.NODE_ENV,
      uptime: process.uptime(),
    });
  } catch (err) {
    res.status(500).json({ status: "ERROR" });
  }
});

export default router;