import asyncHandler from "express-async-handler";

import { buildSearchQuery } from "../utils/buildSearchQuery.js";
import { correctQuery } from "../utils/spellCorrection.js";
import { parseSearchIntent } from "../utils/parseSearchIntent.js";
import { getSemanticCategory } from "../utils/semanticMapper.js";

import SearchTrend from "../models/SearchTrend.js";
import RecentSearch from "../models/RecentSearch.js";

// ✅ UNIFIED RANKING ENGINE (NEW)
import { unifiedRanking } from "../services/ranking/unifiedRankingEngine.js";

/* ================= CACHE KEY ================= */
const buildCacheKey = (params) => {
  return `search:${JSON.stringify(params)}`;
};

/* ================= TREND ================= */
const trackSearchTrend = async ({ keyword, city, category }) => {
  if (!keyword) return;

  await SearchTrend.findOneAndUpdate(
    { query: keyword, city: city || null, category: category || null },
    { $inc: { count: 1 }, lastSearchedAt: new Date() },
    { upsert: true }
  );
};

/* ================= RECENT ================= */
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

  // ================= QUERY PROCESSING =================
  const correctedKeyword = correctQuery(keyword || "");

  const intent = parseSearchIntent(correctedKeyword);
  const semanticCategory = getSemanticCategory(correctedKeyword);

  if (!category && semanticCategory) {
    category = semanticCategory;
  }

  // ================= TRACKING =================
  trackSearchTrend({
    keyword: correctedKeyword,
    city,
    category,
  });

  trackRecentSearch({
    userId: req.user?._id || null,
    keyword: correctedKeyword,
    city,
    category,
  });

  // =====================================================
  // 🚀 UNIFIED RANKING PIPELINE (PRIMARY SOURCE)
  // =====================================================

  let businesses = await unifiedRanking({
    city,
    category,
    keyword: correctedKeyword,
    limit: 300, // bigger pool to avoid missing matches
  });

  // =====================================================
  // 🔥 SAFETY FALLBACK (CRITICAL FIX FOR "NO RESULTS")
  // =====================================================

  if (!businesses || businesses.length === 0) {
    businesses = await unifiedRanking({
      city,
      category: null,
      keyword: correctedKeyword,
      limit: 300,
    });
  }

  if (!businesses || businesses.length === 0) {
    // FINAL EMERGENCY FALLBACK (no filters)
    businesses = await unifiedRanking({
      city: null,
      category: null,
      keyword: correctedKeyword,
      limit: 300,
    });
  }

  // =====================================================
  // 🚀 GEO FILTER (SAFE MODE - NEVER BLOCK ALL RESULTS)
  // =====================================================

  if (lat && lng && distance) {
    const maxDist = Number(distance);

    const toRad = (v) => (v * Math.PI) / 180;

    const geoFiltered = businesses.filter((biz) => {
      if (!biz.location?.coordinates) return false;

      const [bizLng, bizLat] = biz.location.coordinates;

      const R = 6371;
      const dLat = toRad(lat - bizLat);
      const dLng = toRad(lng - bizLng);

      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(bizLat)) *
          Math.cos(toRad(lat)) *
          Math.sin(dLng / 2) ** 2;

      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

      const dist = R * c;

      return dist <= maxDist;
    });

    // 🔥 IMPORTANT: only apply if it doesn't kill results
    if (geoFiltered.length > 0) {
      businesses = geoFiltered;
    }
  }

  // =====================================================
  // 🚀 KEYWORD BOOST (NOT FILTER - ONLY RANK BOOST)
  // =====================================================

  if (correctedKeyword) {
    const q = correctedKeyword.toLowerCase();

    businesses = businesses.sort((a, b) => {
      const score = (biz) => {
        return (
          (biz.name?.toLowerCase().includes(q) ? 5 : 0) +
          ((biz.tags || []).join(" ").toLowerCase().includes(q) ? 3 : 0) +
          (biz.description?.toLowerCase().includes(q) ? 2 : 0)
        );
      };

      return score(b) - score(a);
    });
  }

  // =====================================================
  // 🚀 PAGINATION
  // =====================================================

  const total = businesses.length;

  const paginated = businesses.slice(
    (pageNum - 1) * limitNum,
    pageNum * limitNum
  );

  // =====================================================
  // 🚀 RESPONSE
  // =====================================================

  return res.json({
    success: true,
    businesses: paginated,
    total,
    page: pageNum,
    pages: Math.ceil(total / limitNum),
  });
});