import express from "express";
import { unifiedRanking } from "../services/ranking/unifiedRankingEngine.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const { city, category } = req.query;

    if (!city) return res.json([]);

    const businesses = await unifiedRanking({
      city,
      category,
      limit: 8,
    });

    res.json(businesses);
  } catch (error) {
    console.error("🔥 Recommendation error:", error);

    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
});

export default router;