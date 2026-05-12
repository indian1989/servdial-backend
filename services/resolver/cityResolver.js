// backend/services/resolver/cityResolver.js

import City from "../../models/City.js";
import memoryCache from "../../utils/memoryCache.js";

/* =========================================================
   🧠 NORMALIZE
========================================================= */
const normalize = (str = "") =>
  str
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-");

/* =========================================================
   🧠 RESOLVE CITY BY SLUG
   SSOT:
   slug → city object
========================================================= */
export const resolveCityBySlug = async (slug) => {
  if (!slug) return null;

  const cleanSlug = normalize(slug);

  const cacheKey = `city:slug:${cleanSlug}`;

  // ================= CACHE =================
  const cached = memoryCache.get(cacheKey);

  if (cached) {
    return cached;
  }

  // ================= EXACT SLUG =================
  let city = await City.findOne({
    slug: cleanSlug,
    status: "active",
  }).lean();

  // ================= SLUG HISTORY FALLBACK =================
  if (!city) {
    city = await City.findOne({
      "slugHistory.slug": cleanSlug,
      status: "active",
    }).lean();
  }

  // ================= NAME FALLBACK =================
  // ultra-safe migration fallback only
  if (!city) {
    city = await City.findOne({
      name: new RegExp(`^${cleanSlug.replace(/-/g, " ")}$`, "i"),
      status: "active",
    }).lean();
  }

  if (!city) {
    return null;
  }

  // ================= CACHE STORE =================
  memoryCache.set(cacheKey, city, 60 * 60 * 6);

  return city;
};

/* =========================================================
   🧠 MAIN CITY RESOLVER
   Returns lightweight normalized object
========================================================= */
export const resolveCity = async (cityInput) => {
  if (!cityInput) return null;

  try {
    const city = await resolveCityBySlug(cityInput);

    if (!city) {
      return null;
    }

    return {
      _id: city._id,
      name: city.name,
      slug: city.slug,
      district: city.district || null,
      state: city.state || null,
    };
  } catch (error) {
    console.error("resolveCity error:", error);

    return null;
  }
};