import Business from "../../models/Business.js";
import { rankBusinesses } from "../../utils/rankBusinesses.js";

/**
 * UNIFIED SEARCH ENGINE (EXECUTION LAYER - FIXED)
 */

export const unifiedSearchEngine = async (searchContext = {}) => {
  const {
    cityId,
    categoryId,
    categoryIds,
    textSearch,
    filters = {},
    limit = 20,
  } = searchContext;

  // ================= BASE QUERY =================
  const query = {
    status: "approved",
    isDeleted: false,
  };

  // ================= CITY FILTER =================
  if (cityId) {
    query.cityId = cityId;
  }

  // ================= CATEGORY FILTER (FIXED LOGIC) =================
  // 🔥 PRIORITY ORDER:
  // 1. categoryId (primary)
  // 2. categoryIds (fallback tree match)

  if (categoryId) {
    query.categoryId = categoryId;
  } else if (categoryIds?.length) {
    query.categoryId = { $in: categoryIds };
  }

  // ================= TEXT SEARCH (FIXED SAFETY) =================
  if (textSearch) {
  const tokens = textSearch
    .split(" ")
    .filter(Boolean);

  query.$or = [
    { name: { $regex: textSearch, $options: "i" } },
    { description: { $regex: textSearch, $options: "i" } },
    { categorySlug: { $regex: textSearch, $options: "i" } },
    { citySlug: { $regex: textSearch, $options: "i" } },

    // token-level fallback (VERY IMPORTANT)
    ...tokens.map(t => ({
      name: { $regex: t, $options: "i" }
    }))
  ];
}

  // ================= GEO FILTER =================
  if (filters?.lat && filters?.lng) {
    query.location = {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: [filters.lng, filters.lat],
        },
        $maxDistance: (filters.distance || 10) * 1000,
      },
    };
  }

  // ================= FETCH =================
  const businesses = await Business.find(query)
    .populate("cityId", "name slug")
    .populate("categoryId", "name slug")
    .limit(Number(limit) || 20)
    .lean();

  // ================= DEBUG (TEMP - IMPORTANT) =================
  console.log("🔥 SEARCH QUERY:", JSON.stringify(query, null, 2));
  console.log("🔥 FOUND BUSINESSES:", businesses.length);

  // ================= RANK =================
  const ranked = await rankBusinesses(businesses, searchContext);

  return ranked;
};