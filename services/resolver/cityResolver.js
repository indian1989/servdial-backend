// backend/services/resolver/cityResolver.js
import City from "../../models/City.js";
import memoryCache from "../../utils/memoryCache.js";


// =============================
// 🧠 RESOLVE CITY BY SLUG
// =============================
export const resolveCityBySlug = async (slug) => {
  const cacheKey = `city:slug:${slug}`;

  const cached = memoryCache.get(cacheKey);
  if (cached) return cached;

  let city = await City.findOne({ slug }).lean();

  if (!city) {
    city = await City.findOne({
      slugHistory: slug,
    }).lean();
  }

  if (!city) return null;

  memoryCache.set(cacheKey, city, 60 * 60 * 6);

  return city;
};

export const resolveCity = async (city) => {
  if (!city) return null;

  try {
    return await City.findOne({
      slug: city,
      status: "active",
    }).select("_id name slug");

  } catch (err) {
    console.error("resolveCity error:", err);
    return null;
  }
};