import asyncHandler from "express-async-handler";
import { correctQuery } from "../utils/spellCorrection.js";
import { parseSearchIntent } from "../utils/parseSearchIntent.js";
import { getSemanticCategory } from "../utils/semanticMapper.js";

import SearchTrend from "../models/SearchTrend.js";
import RecentSearch from "../models/RecentSearch.js";

import { unifiedRanking } from "../services/ranking/unifiedRankingEngine.js";

/* ================= TRACK ================= */
const trackSearchTrend = async ({ keyword, city, category }) => {
  if (!keyword) return;

  await SearchTrend.findOneAndUpdate(
    { query: keyword, city: city || null, category: category || null },
    { $inc: { count: 1 }, lastSearchedAt: new Date() },
    { upsert: true }
  );
};

const trackRecentSearch = async ({ userId, keyword, city, category }) => {
  if (!keyword) return;

  await RecentSearch.findOneAndUpdate(
    { user: userId || null, query: keyword },
    {
      city: city || null,
      category: category || null,
      lastSearchedAt: new Date(),
    },
    { upsert: true }
  );
};

/* ================= MAIN SEARCH ================= */
export const searchBusinesses = asyncHandler(async (req, res) => {
  let {
    city,
    category,
    keyword,
    q, // ✅ IMPORTANT FIX
    rating,
    page = 1,
    limit = 12,
    lat,
    lng,
    distance,
    openNow,
  } = req.query;

  const pageNum = Number(page);
  const limitNum = Number(limit);

  // ✅ FIX 1: unify query
  const rawQuery = keyword || q || "";
  const correctedKeyword = correctQuery(rawQuery);

  const intent = parseSearchIntent(correctedKeyword);
  const semanticCategory = getSemanticCategory(correctedKeyword);

  if (!category && semanticCategory) {
    category = semanticCategory;
  }

  // ================= TRACK =================
  trackSearchTrend({ keyword: correctedKeyword, city, category });

  trackRecentSearch({
    userId: req.user?._id || null,
    keyword: correctedKeyword,
    city,
    category,
  });

  // ================= FETCH =================
  let businesses = await unifiedRanking({
    city,
    category,
    limit: 300,
  });

  // ================= KEYWORD FILTER + BOOST (FINAL FIX) =================
if (correctedKeyword) {
  const qLower = correctedKeyword.toLowerCase();

  // ✅ STEP 1: HARD FILTER (keep relevant results only)
  let keywordMatched = businesses.filter((b) => {
    const name = b.name?.toLowerCase() || "";
    const tags = (b.tags || []).join(" ").toLowerCase();
    const category = (b.category || "").toLowerCase();

    return (
      name.includes(qLower) ||
      tags.includes(qLower) ||
      category.includes(qLower)
    );
  });

  // ✅ STEP 2: FALLBACK (if nothing matched)
  if (keywordMatched.length === 0) {
    keywordMatched = businesses;
  }

  // ✅ STEP 3: STRONG RANKING
  keywordMatched = keywordMatched.map((b) => {
    let boost = 0;
    const name = b.name?.toLowerCase() || "";

    if (name === qLower) boost += 2000; // 🚀 EXACT MATCH
    else if (name.startsWith(qLower)) boost += 1000;
    else if (name.includes(qLower)) boost += 500;

    return {
      ...b,
      finalScore: (b.qualityScore || 0) + boost,
    };
  });

  keywordMatched.sort((a, b) => b.finalScore - a.finalScore);

  businesses = keywordMatched;
}

  // ================= GEO FILTER (FIXED) =================
  if (lat && lng && distance) {
    const maxDist = Number(distance);

    const toRad = (v) => (v * Math.PI) / 180;

    businesses = businesses.filter((biz) => {
      // ✅ FIX: DO NOT REMOVE IF NO LOCATION
      if (
        !biz.location ||
        !Array.isArray(biz.location.coordinates) ||
        biz.location.coordinates.length !== 2
      ) {
        return true; // KEEP IT
      }

      const [lng2, lat2] = biz.location.coordinates;

      if (lat2 === 0 && lng2 === 0) return true; // invalid coords → keep

      const R = 6371;
      const dLat = toRad(lat - lat2);
      const dLng = toRad(lng - lng2);

      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat2)) *
          Math.cos(toRad(lat)) *
          Math.sin(dLng / 2) ** 2;

      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

      return R * c <= maxDist;
    });
  }

  // ================= RATING FILTER =================
  if (rating) {
    businesses = businesses.filter(
      (b) => (b.averageRating || 0) >= Number(rating)
    );
  }

  // ================= PAGINATION =================
  const total = businesses.length;

  const paginated = businesses.slice(
    (pageNum - 1) * limitNum,
    pageNum * limitNum
  );

  res.json({
    success: true,
    businesses: paginated,
    total,
    page: pageNum,
    pages: Math.ceil(total / limitNum),
  });
});