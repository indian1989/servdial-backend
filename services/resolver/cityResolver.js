import City from "../../models/City.js";
import memoryCache from "../../utils/memoryCache.js";


// =============================
// 🧠 RESOLVE CITY BY SLUG
// =============================
export const resolveCityBySlug = async (slug) => {
  const cacheKey = `city:slug:${slug}`;

  // ✅ 1. Check cache
  const cached = memoryCache.get(cacheKey);
  if (cached) return cached;

  // =============================
  // 2. Find by current slug
  // =============================
  let city = await City.findOne({ slug }).lean();

  // =============================
  // 3. Fallback → slugHistory
  // =============================
  if (!city) {
    city = await City.findOne({
      "slugHistory.slug": slug,
    }).lean();
  }

  if (!city) return null;

  // =============================
  // 4. Cache result
  // =============================
  memoryCache.set(cacheKey, city, 60 * 60 * 6); // 6 hours

  return city;
};

export const resolveCity = async (city, CityModel) => {
  if (!city) return null;

  try {
    return await CityModel.findOne({
      $or: [
        { slug: city },
        { name: city },
        { cityName: city },
      ],
      status: "active",
    }).select("_id name slug citySlug");
  } catch (err) {
    console.error("resolveCity error:", err);
    return null;
  }
};