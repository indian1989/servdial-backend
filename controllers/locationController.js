// backend/controllers/locationController.js
import axios from "axios";

// ================= REVERSE GEO =================
export const reverseLocation = async (req, res) => {
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

    const city =
      address.city ||
      address.town ||
      address.village ||
      address.state ||
      "India";

    res.json({ city });

  } catch (err) {
    console.error("Reverse geo error:", err.message);
    res.status(500).json({ city: "India" });
  }
};


// ================= IP LOCATION =================
export const getIPLocation = async (req, res) => {
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
};