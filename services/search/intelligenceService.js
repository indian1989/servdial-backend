import Business from "../../models/Business.js";
import RecentSearch from "../../models/RecentSearch.js";
import searchTrend from "../../models/searchTrend.js";

/* =========================================================
   🔍 AUTOCOMPLETE SERVICE
========================================================= */
export const getAutocompleteService = async (q = "") => {
  if (!q) return [];

  const regex = new RegExp(q, "i");

  const results = await Business.find({
    name: regex,
    status: "approved",
    isDeleted: false,
  })
    .select("name slug")
    .limit(8)
    .lean();

  return results.map((b) => ({
    name: b.name,
    slug: b.slug,
  }));
};

/* =========================================================
   📈 TRENDING SEARCHES
========================================================= */
export const getTrendingSearchesService = async () => {
  const trends = await searchTrend
    .find({})
    .sort({ count: -1 })
    .limit(10)
    .lean();

  return trends.map((t) => t.query);
};

/* =========================================================
   🕘 RECENT SEARCHES
========================================================= */
export const getRecentSearchesService = async (userId) => {
  if (!userId) return [];

  const recent = await RecentSearch
    .find({ userId })
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  return recent.map((r) => r.query);
};