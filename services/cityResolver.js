// backend/services/cityResolver.js
import City from "../models/City.js";
import { getCache, setCache } from "../utils/memoryCache.js";

export const resolveCityBySlug = async (citySlug) => {
  
  if (!citySlug) return null;

  const cacheKey = `city:slug:${citySlug}`;

  const cached = getCache(cacheKey);
  if (cached) return cached;

  const city = await City.findOne({
    $or: [
      { slug: citySlug },
      { slugHistory: citySlug },
    ],
    status: "active",
  }).lean();

  if (city) {
    setCache(cacheKey, city, 3600); // 1 hour TTL
    return city;
  }

  return null;
};

// ================ NORMALIZE ===================
const normalize = (str) =>
  str?.trim().toLowerCase().replace(/\s+/g, " ");

export const resolveCity = async ({
  citySlug,
  cityName,
  latitude,
  longitude,
}) => {
  // 🔥 PRIORITY 1: SLUG
  if (citySlug) {
    const cacheKey = `city:slug:${citySlug}`;

    const cached = getCache(cacheKey);
    if (cached) return cached;

    const city = await City.findOne({
  status: "active",
      $or: [
        { slug: citySlug },
        { slugHistory: citySlug },
      ],
    }).lean();

    if (city) {
      setCache(cacheKey, city, 3600);
      return city;
    }
  }

  // 🔥 PRIORITY 2: NAME
  if (cityName) {
    const normalized = normalize(cityName);
const cacheKey = `city:name:${normalized}`;

const cached = getCache(cacheKey);

    const escapeRegex = (text) => {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
if (cached) return cached;
};

  const safe = escapeRegex(normalized);

const city = await City.findOne({
  name: new RegExp(`^${safe}$`, "i"),
  status: "active",
}).lean();

    if (city) {
  setCache(cacheKey, city, 60 * 60 * 6); // 6 hours
  return city;
}

setCache(`city:id:${city._id}`, city, 60 * 60 * 6);
  }

  // 🔥 PRIORITY 3: GEO
  const lat = Number(latitude).toFixed(2);
const lng = Number(longitude).toFixed(2);
const cacheKey = `city:geo:${lat}:${lng}`;

const cached = getCache(cacheKey);
if (cached) return cached;
  if (latitude && longitude) {
    const city = await City.findOne({
  status: "active",
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [longitude, latitude],
          },
          $maxDistance: 50000, // 50km
        },
      },
    }).lean();

    if (city) {
  setCache(cacheKey, city, 1800); // shorter TTL (30 min)
  return city;
}

    if (city) return city;
  }

  return null;
};