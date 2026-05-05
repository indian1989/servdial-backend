import City from "../../models/City.js";
import memoryCache from "../../utils/memoryCache.js";

// =============================
// 🧠 NORMALIZE INPUT
// =============================
const normalize = (str) =>
  str
    ?.toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-");

// =============================
// 🧠 RESOLVE CITY BY SLUG (ROBUST)
// =============================
export const resolveCityBySlug = async (slug) => {
  if (!slug) return null;

  const cleanSlug = normalize(slug);
  const cacheKey = `city:slug:${cleanSlug}`;

  const cached = memoryCache.get(cacheKey);
  if (cached) return cached;

  // 1️⃣ exact match (NEW SYSTEM)
  let city = await City.findOne({
    slug: cleanSlug,
    status: "active",
  }).lean();

  // 2️⃣ fallback: old slug system (IMPORTANT FIX)
  if (!city) {
    city = await City.findOne({
      slugHistory: cleanSlug,
      status: "active",
    }).lean();
  }

  // 3️⃣ fallback: name match (ULTRA SAFETY)
  if (!city) {
    city = await City.findOne({
      name: new RegExp(`^${cleanSlug}$`, "i"),
      status: "active",
    }).lean();
  }

  if (!city) return null;

  memoryCache.set(cacheKey, city, 60 * 60 * 6);
  return city;
};

// =============================
// 🧠 MAIN RESOLVER (FIXED)
// =============================
export const resolveCity = async (city) => {
  if (!city) return null;

  const clean = normalize(city);

  try {
    // 1️⃣ direct slug match
    let result = await City.findOne({
      slug: clean,
      status: "active",
    }).select("_id name slug");

    // 2️⃣ fallback: slugHistory (OLD SYSTEM FIX)
    if (!result) {
      result = await City.findOne({
        slugHistory: clean,
        status: "active",
      }).select("_id name slug");
    }

    // 3️⃣ fallback: name match
    if (!result) {
      result = await City.findOne({
        name: new RegExp(`^${clean}$`, "i"),
        status: "active",
      }).select("_id name slug");
    }

    return result || null;
  } catch (err) {
    console.error("resolveCity error:", err);
    return null;
  }
};