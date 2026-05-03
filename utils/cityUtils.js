import slugify from "slugify";

// ================= NORMALIZE =================
export const normalizeCity = (data) => {
  const name = data.name?.trim();
  const district = data.district?.trim();
  const state = data.state?.trim();

  const lat = Number(data.latitude);
  const lng = Number(data.longitude);

  const latitude = isNaN(lat) ? undefined : lat;
  const longitude = isNaN(lng) ? undefined : lng;

  return {
    name,
    district,
    state,
    country: data.country || "India",

    latitude,
    longitude,

    // ✅ keep geo in sync
    location:
      latitude !== undefined && longitude !== undefined
        ? {
            type: "Point",
            coordinates: [longitude, latitude], // 🔥 lng first
          }
        : undefined,
  };
};


// ================= VALIDATE =================
export const validateCity = (city) => {
  if (!city.name || !city.district || !city.state) {
    throw new Error("City, district, state required");
  }
};


// ================= FETCH COORD =================
export const fetchCoordinates = async (city) => {
  // already present
  if (
    city.latitude !== undefined &&
    city.longitude !== undefined &&
    !isNaN(city.latitude) &&
    !isNaN(city.longitude)
  ) {
    return city;
  }

  try {
    const query = `${city.name}, ${city.district}, ${city.state}, India`;

    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`
    );

    const data = await res.json();

    if (data?.length > 0) {
      const lat = parseFloat(data[0].lat);
      const lng = parseFloat(data[0].lon);

      return {
        ...city,
        latitude: lat,
        longitude: lng,
        location: {
          type: "Point",
          coordinates: [lng, lat],
        },
      };
    }

    return city;

  } catch (err) {
    console.error("Geo error:", err);
    return city;
  }
};