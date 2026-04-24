// backend/controllers/autocompleteController.js
import Business from "../models/Business.js";
import asyncHandler from "express-async-handler";
import { buildAutocompleteQuery } from "../utils/buildAutocompleteQuery.js";
import BusinessClick from "../models/BusinessClick.js";
import UserPreference from "../models/UserPreference.js";
import SearchTrend from "../models/SearchTrend.js";
import RecentSearch from "../models/RecentSearch.js";
import City from "../models/City.js";
import { setCache, getCache } from "../utils/memoryCache.js";

/* ================= HELPER ================= */
const getMatchScore = (text = "", tokens = []) => {
  let score = 0;
  const lower = text.toLowerCase();

  for (const t of tokens) {
    if (!t) continue;

    if (lower.startsWith(t)) score += 25;
    else if (lower.includes(t)) score += 10;
  }

  return score;
};

/* ================= MAIN AUTOCOMPLETE ================= */
export const getAutocompleteSuggestions = asyncHandler(async (req, res) => {
  const { q, city } = req.query;
  const userId = req.user?._id || null;

  if (!q || q.trim().length < 1) {
    return res.json({
      success: true,
      suggestions: [],
    });
  }

  const queryText = q.trim().toLowerCase();
  // ================= RESOLVE CITY =================
let cityId = null;

if (city) {
  const cityDoc = await City.findOne({
  slug: city.toLowerCase().trim(),
}).select("_id name slug");

  if (cityDoc) {
    cityId = cityDoc._id;
  }
}
  const tokens = queryText.split(" ").filter(Boolean);

  /* ================= CACHE ================= */
  const cacheKey = `autocomplete:${queryText}:${city || "all"}`;
  const cached = getCache(cacheKey);

  if (cached) {
    return res.json(cached);
  }

  /* ================= TREND + RECENT ================= */

// ✅ SAFE REGEX
const escapeRegex = (str) =>
  str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const safeQuery = escapeRegex(queryText);
const regex = new RegExp(safeQuery, "i");

// ✅ TRACK TREND
await SearchTrend.findOneAndUpdate(
  {
    query: queryText,
    cityId: cityId || null,
  },
  {
    $inc: { count: 1 },
    lastSearchedAt: new Date(),
  },
  { upsert: true }
);

// ✅ TRACK RECENT (SEPARATE — NOT inside Promise.all)
if (userId) {
  await RecentSearch.findOneAndUpdate(
  {
    user: userId,
    query: queryText,
  },
  {
    cityId: cityDoc?._id || null,
    citySlug: cityDoc?.slug || null,
    cityName: cityDoc?.name || null,
    lastSearchedAt: new Date(),
  },
  { upsert: true }
);
}

// ✅ FETCH TRENDING + RECENT
const [trending, recent] = await Promise.all([
  SearchTrend.find({
    query: regex,
    ...(cityId && { cityId }),
  })
    .sort({ count: -1 })
    .limit(5)
    .select("query")
    .lean(),

  RecentSearch.find({
    query: regex,
    ...(userId && { user: userId }),
  })
    .sort({ lastSearchedAt: -1 })
    .limit(5)
    .select("query")
    .lean(),
]);

  const querySuggestions = [
    ...new Set([
      ...trending.map((t) => t.query),
      ...recent.map((r) => r.query),
    ]),
  ].slice(0, 5);

  /* ================= BUSINESS SEARCH ================= */
  const mongoQuery = buildAutocompleteQuery(queryText);
  if (cityId) {
  mongoQuery.cityId = cityId;
}

  const results = await Business.find(mongoQuery)
    .select(
  "name category categoryId cityName citySlug averageRating reviewCount isFeatured views tags"
)
    .limit(12)
    .lean();

  const businessIds = results.map((b) => b._id);

  /* ================= CLICK DATA ================= */
  const clickData = await BusinessClick.aggregate([
    {
      $match: {
  business: { $in: businessIds },
  ...(cityId && { cityId }),
},
    },
    {
      $group: {
        _id: "$business",
        clicks: { $sum: 1 },
      },
    },
  ]);

  const clickMap = {};
  for (const c of clickData) {
    clickMap[String(c._id)] = c.clicks;
  }

  /* ================= USER PREFERENCES ================= */
  let prefMap = {};

  if (userId) {
    const prefs = await UserPreference.find({ user: userId }).lean();

    for (const p of prefs) {
      if (p.category) {
        prefMap[String(p.category)] = p.score;
      }
    }
  }

  /* ================= SCORING ================= */
  let businessSuggestions = results.map((biz) => {
    let score = 0;

    const name = biz.name?.toLowerCase() || "";
    const tags = (biz.tags || []).join(" ").toLowerCase();

    const rating = biz.averageRating || 0;
    const reviews = biz.reviewCount || 0;
    const featured = biz.isFeatured || false;
    const views = biz.views || 0;

    /* MATCH */
    if (name === queryText) score += 150;

    score += getMatchScore(name, tokens);
    score += getMatchScore(tags, tokens) * 0.7;

    /* QUALITY */
    score += rating * 22;
    score += Math.log10(reviews + 1) * 12;

    /* POPULARITY */
    score += Math.log10(views + 1) * 15;

    /* FEATURED */
    if (featured) score += 40;

    /* CLICK SIGNAL */
    const clicks = clickMap[String(biz._id)] || 0;
    score += Math.log2(clicks + 1) * 40;

    /* PERSONALIZATION */
    if (biz.categoryId) {
      const prefScore = prefMap[String(biz.categoryId)];
      if (prefScore) score += prefScore * 5;
    }

    return {
      type: "business",
      id: biz._id,
      name: biz.name,
      category: biz.category,
      city: biz.cityName,
      score,
    };
  });

  businessSuggestions = businessSuggestions
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

  /* ================= QUERY SUGGESTIONS ================= */
  const formattedQuerySuggestions = querySuggestions.map((q) => ({
    type: "query",
    name: q,
  }));

  /* ================= FINAL OUTPUT ================= */
  const finalSuggestions = [
    ...formattedQuerySuggestions,
    ...businessSuggestions,
  ];

  const response = {
    success: true,
    suggestions: finalSuggestions,
  };

  /* ================= CACHE STORE ================= */
  setCache(cacheKey, response, 60);

  return res.json(response);
});