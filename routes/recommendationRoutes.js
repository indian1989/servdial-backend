import express from "express";
import Business from "../models/Business.js";

const router = express.Router();

// ================= RECOMMEND BUSINESSES =================
router.get("/", async (req, res) => {
  try {
    const { city } = req.query;

    if (!city) return res.json([]);

    const businesses = await Business.find({
      status: "approved",
      city: city, // ✅ filter in DB (FAST)
    })
      .populate("categoryId") // optional
      .sort({ averageRating: -1 }) // ✅ FIXED
      .limit(8)
      .lean();

    res.json(businesses);
  } catch (error) {
    console.error("Recommendation error:", error);

    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
});

export default router;