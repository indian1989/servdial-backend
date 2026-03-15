import express from "express";
import Business from "../models/Business.js";

const router = express.Router();

// ================= RECOMMEND BUSINESSES =================
router.get("/", async (req, res) => {

  try {

    const { city } = req.query;

    if (!city) {
      return res.json([]);
    }

    const businesses = await Business.find({
  status:"approved",
})
.populate("city")
.populate("category")
.sort({ rating:-1 })
.limit(8);

const filtered = businesses.filter(
  b => b.city?.name?.toLowerCase() === city.toLowerCase()
);

res.json(filtered);

  } catch (error) {

    console.error(error);
    res.status(500).json({
      message: "Server error"
    });

  }

});

export default router;