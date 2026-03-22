import express from "express";
import asyncHandler from "express-async-handler";
import axios from "axios";

const router = express.Router();

// ================= REVERSE GEO =================
router.get(
  "/reverse",
  asyncHandler(async (req, res) => {
    const { lat, lng } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ message: "Lat/Lng required" });
    }

    try {
      const response = await axios.get(
        "https://nominatim.openstreetmap.org/reverse",
        {
          params: {
            lat,
            lon: lng,
            format: "json",
          },
          headers: {
            "User-Agent": "servdial-app",
          },
        }
      );

      const address = response.data.address;

      // ✅ BETTER CITY DETECTION
      const city =
        address.city ||
        address.town ||
        address.village ||
        address.county ||
        null;

      const state = address.state || null;

      res.json({
        city: city || state || "India",
      });

    } catch (err) {
      console.error("Reverse geo error:", err.message);
      res.status(500).json({ city: "India" });
    }
  })
);


// ================= IP LOCATION =================
router.get(
  "/ip",
  asyncHandler(async (req, res) => {
    try {
      const ip =
        req.headers["x-forwarded-for"] ||
        req.socket.remoteAddress ||
        "";

      const response = await axios.get(
        `http://ip-api.com/json/${ip}`
      );

      res.json({
        city: response.data.city || "India",
      });

    } catch (err) {
      console.error("IP location error:", err.message);
      res.json({ city: "India" });
    }
  })
);

export default router;