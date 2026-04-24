import axios from "axios";

const API_KEY = process.env.OPENCAGE_API_KEY;

export const geocodeCity = async ({ name, district, state }) => {
  try {
    const query = `${name}, ${district}, ${state}, India`;

    const url = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(query)}&key=${API_KEY}`;

    const res = await axios.get(url);

    const result = res.data.results[0];

    if (!result) return null;

    return {
      latitude: result.geometry.lat,
      longitude: result.geometry.lng,
      location: {
        type: "Point",
        coordinates: [result.geometry.lng, result.geometry.lat],
      },
    };

  } catch (err) {
    console.error("Geocoding failed:", err.message);
    return null;
  }
};