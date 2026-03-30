import asyncHandler from "express-async-handler";

import { unifiedRanking } from "../services/ranking/unifiedRankingEngine.js";
import {
  classifyQuery,
  assignBucket,
} from "../services/search/queryIntelligenceEngine.js";

import SearchTrend from "../models/SearchTrend.js";
import RecentSearch from "../models/RecentSearch.js";

/* ================= TRACKING ================= */
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
  let { city, category, keyword, page = 1, limit = 12 } = req.query;

  const pageNum = Number(page);
  const limitNum = Number(limit);

  const query = (keyword || "").trim().toLowerCase();

  // ================= TRACK =================
  trackSearchTrend({ keyword: query, city, category });
  trackRecentSearch({
    userId: req.user?._id || null,
    keyword: query,
    city,
    category,
  });

  // ================= STEP 1: FETCH BASE =================
  const baseBusinesses = await unifiedRanking({
    city,
    category,
    limit: 300,
  });

  // ================= STEP 2: QUERY INTELLIGENCE =================
  const queryData = classifyQuery(query);

  // ================= STEP 3: BUCKETING =================
  const buckets = {
    1: [],
    2: [],
    3: [],
    4: [],
  };

  baseBusinesses.forEach((biz) => {
    const bucket = assignBucket(biz, queryData);
    buckets[bucket].push(biz);
  });

  // ================= STEP 4: SORT INSIDE BUCKET =================
  Object.keys(buckets).forEach((key) => {
    buckets[key].sort((a, b) => b.qualityScore - a.qualityScore);
  });

  // ================= STEP 5: MERGE BUCKETS =================
  let finalResults = [
    ...buckets[1],
    ...buckets[2],
    ...buckets[3],
    ...buckets[4],
  ];

  // ================= STEP 6: PAGINATION =================
  const total = finalResults.length;

  finalResults = finalResults.slice(
    (pageNum - 1) * limitNum,
    pageNum * limitNum
  );

  // ================= RESPONSE =================
  res.json({
    success: true,
    businesses: finalResults,
    total,
    page: pageNum,
    pages: Math.ceil(total / limitNum),
  });
});