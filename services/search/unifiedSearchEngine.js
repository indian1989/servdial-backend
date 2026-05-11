import Business from "../../models/Business.js";
import { rankBusinesses } from "../../utils/rankBusinesses.js";

/**
 * UNIFIED SEARCH ENGINE (EXECUTION LAYER)
 * ONLY responsibility:
 * → take searchContext
 * → fetch raw businesses
 */

export const unifiedSearchEngine = async (searchContext = {}) => {
  const {
    cityId,
    categoryId,
    categoryIds,
    textSearch,
    filters = {},
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

  // ================= CATEGORY FILTER =================
  if (categoryId) {
    query.categoryId = categoryId;
  } else if (categoryIds?.length) {
    query.categoryId = { $in: categoryIds };
  }

  // ================= TEXT SEARCH =================
  if (textSearch) {
    query.$or = [
      { name: { $regex: textSearch, $options: "i" } },
      { description: { $regex: textSearch, $options: "i" } },
    ];
  }

  // ================= GEO FILTER (FUTURE SAFE) =================
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
    .limit(50)
    .lean();

  // ================= RANK =================
  const ranked = await rankBusinesses(
    businesses,
    searchContext
  );

  return ranked;
};