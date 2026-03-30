import asyncHandler from "express-async-handler";

import { correctQuery } from "../utils/spellCorrection.js";
import { parseSearchIntent } from "../utils/parseSearchIntent.js";
import { getSemanticCategory } from "../utils/semanticMapper.js";

import SearchTrend from "../models/SearchTrend.js";
import RecentSearch from "../models/RecentSearch.js";

// ✅ UNIFIED ENGINE
import { unifiedRanking } from "../services/ranking/unifiedRankingEngine.js";

/* ================= TRACK TREND ================= */
const trackSearchTrend = async ({ keyword, city, category }) => {
  if (!keyword) return;

  await SearchTrend.findOneAndUpdate(
    { query: keyword, city: city || null, category: category || null },
    { $inc: { count: 1 }, lastSearchedAt: new Date() },
    { upsert: true }
  );
};

/* ================= TRACK RECENT ================= */
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
    page = 1,
    limit = 12,
    lat,
    lng,
    distance,
  } = req.query;

  const pageNum = Number(page);
  const limitNum = Number(limit);

  // ================= QUERY PROCESS =================
  const correctedKeyword = correctQuery(keyword || "");
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

  // =====================================================
  // 🚀 STEP 1: FETCH BROAD DATA (NO STRICT FILTERS)
  // =====================================================
  let businesses = await unifiedRanking({
    city,
    category,
    limit: 300, // BIG pool
  });

  // =====================================================
  // 🚀 STEP 2: KEYWORD BOOST (NOT FILTER)
  // =====================================================
  if (correctedKeyword) {
    const q = correctedKeyword.toLowerCase();

    businesses = businesses.sort((a, b) => {
      const aScore =
        (a.name?.toLowerCase().includes(q) ? 10 : 0) +
        ((a.tags || []).join(" ").toLowerCase().includes(q) ? 5 : 0);

      const bScore =
        (b.name?.toLowerCase().includes(q) ? 10 : 0) +
        ((b.tags || []).join(" ").toLowerCase().includes(q) ? 5 : 0);

      return bScore - aScore;
    });
  }

  // =====================================================
  // 🚀 STEP 3: SOFT FILTERS (NOT HARD REMOVE)
  // =====================================================

  // DISTANCE (soft)
  if (lat && lng && distance) {
    const maxDist = Number(distance);

    const toRad = (v) => (v * Math.PI) / 180;

    businesses = businesses.map((biz) => {
      if (!biz.location?.coordinates) return biz;

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

      return {
        ...biz,
        finalScore: biz.finalScore - dist * 2, // penalty instead of remove
      };
    });
  }

  // OPEN NOW (soft)
  if (intent.openNow) {
    businesses = businesses.map((biz) => {
      // you can later implement real hours logic
      return {
        ...biz,
        finalScore: biz.finalScore - 5, // small penalty
      };
    });
  }

  // =====================================================
  // 🚀 STEP 4: FINAL SORT
  // =====================================================
  businesses.sort((a, b) => b.finalScore - a.finalScore);

  // =====================================================
  // 🚀 STEP 5: PAGINATION
  // =====================================================
  const total = businesses.length;

  const paginated = businesses.slice(
    (pageNum - 1) * limitNum,
    pageNum * limitNum
  );

  // =====================================================
  // 🚀 RESPONSE
  // =====================================================
  res.json({
    success: true,
    businesses: paginated,
    total,
    page: pageNum,
    pages: Math.ceil(total / limitNum),
  });
});