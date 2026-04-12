// backend/controllers/searchController.js
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
  const limitNum = Math.min(Number(limit) || 12, 50);

  // ✅ FIX 1: unify query
  const rawQuery = keyword || q || "";
  const correctedKeyword = correctQuery(rawQuery);

  const intent = parseSearchIntent(correctedKeyword);
  const semanticCategory = getSemanticCategory(correctedKeyword);

  if (!category && semanticCategory) {
    category = semanticCategory;
  }

  // ================= TRACK =================
  await trackSearchTrend({ keyword: correctedKeyword, city, category });

await trackRecentSearch({
  userId: req.user?._id || null,
  keyword: correctedKeyword,
  city,
  category,
});

  let geoFilter = null;

if (lat && lng) {
  geoFilter = {
    lat: Number(lat),
    lng: Number(lng),
    distance: Number(distance || 10),
  };
}

  // ================= FETCH =================
  let businesses = await unifiedRanking({
    city,
    category,
    q: correctedKeyword,
    limit: 300,
   geo: geoFilter
  });

  businesses = businesses.filter(
  (b) => b.status === "approved" && !b.isDeleted
);

  // ================= GEO FILTER FIRST (CRITICAL) =================
const latNum = Number(lat);
const lngNum = Number(lng);

if (!isNaN(latNum) && !isNaN(lngNum) && latNum !== 0 && lngNum !== 0) {
  const maxDist = Number(distance || 10);

  const toRad = (v) => (v * Math.PI) / 180;

  businesses = businesses.filter((biz) => {
    if (
      !biz.location ||
      !Array.isArray(biz.location.coordinates) ||
      biz.location.coordinates.length !== 2
    ) return false;

    const [lng2, lat2] = biz.location.coordinates;

    // ❌ REMOVE INVALID COORDS
    if (!lat2 || !lng2 || lat2 === 0 || lng2 === 0) return false;

    const R = 6371;
    const dLat = toRad(latNum - lat2);
const dLng = toRad(lngNum - lng2);

    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat2)) *
        Math.cos(toRad(latNum)) *
        Math.sin(dLng / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c <= maxDist;
  });
}

 // ================= KEYWORD RANKING (FINAL CLEAN) =================
if (correctedKeyword && correctedKeyword.length >= 2) {
  const q = correctedKeyword.toLowerCase();

  const exact = [];
  const starts = [];
  const contains = [];
  const others = [];

  for (const b of businesses) {
    const name = b.name?.toLowerCase() || "";
    const tags = (b.tags || []).join(" ").toLowerCase();
    const cat = (b.categorySlug || "").toLowerCase();

    if (name === q) exact.push(b);
    else if (name.startsWith(q)) starts.push(b);
    else if (name.includes(q)) contains.push(b);
    else if (tags.includes(q) || cat.includes(q)) contains.push(b);
    else others.push(b);
  }

  businesses = [...exact, ...starts, ...contains, ...others];
}

// 🔥 BOOST FEATURED
businesses.sort((a, b) => {
  if (a.isFeatured !== b.isFeatured) {
    return b.isFeatured - a.isFeatured;
  }
  return (b.averageRating || 0) - (a.averageRating || 0);
});

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
  meta: {
    total,
    page: pageNum,
    pages: Math.ceil(total / limitNum),
    limit: limitNum,
    hasMore: pageNum * limitNum < total,
  },
  data: paginated,
});
});