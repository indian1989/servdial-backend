import Business from "../models/Business.js";
import { rankBusinesses } from "../utils/rankBusinesses.js";
import asyncHandler from "express-async-handler";
import SearchTrend from "../models/SearchTrend.js";
import { buildSearchQuery } from "../utils/buildSearchQuery.js";
import RecentSearch from "../models/RecentSearch.js";
import { correctQuery } from "../utils/spellCorrection.js";
import { parseSearchIntent } from "../utils/parseSearchIntent.js";
import { getSemanticCategory } from "../utils/semanticMapper.js";


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

/* ================= NORMALIZE ================= */
const normalizeBusiness = (biz) => ({
  ...biz,
  rating: biz.averageRating ?? biz.rating ?? 0,
  reviewCount: biz.totalReviews ?? biz.reviewCount ?? 0,
  featured: biz.isFeatured ?? biz.featured ?? false,
});

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

  const correctedKeyword = correctQuery(keyword);
  const intent = parseSearchIntent(correctedKeyword);
  const semanticCategory = getSemanticCategory(correctedKeyword);

  if (!category && semanticCategory) {
    category = semanticCategory;
  }

  const cacheKey = buildCacheKey({
    city,
    category,
    keyword: correctedKeyword,
    rating,
    page,
    lat,
    lng,
    distance,
  });

  /* ================= BUILD QUERY ================= */
  const searchQuery = buildSearchQuery({
    city,
    category,
    keyword: correctedKeyword,
    rating: intent.minRating || rating,
    openNow: intent.openNow || openNow,
  });

  trackSearchTrend({ keyword: correctedKeyword, city, category });

  trackRecentSearch({
    userId: req.user?._id || null,
    keyword: correctedKeyword,
    city,
    category,
  });

  let businesses = [];
  let total = 0;

  if ((lat && lng && distance) || intent.nearMe) {
    const pipeline = [
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [Number(lng), Number(lat)],
          },
          distanceField: "distance",
          maxDistance: Number(distance || 5000),
          spherical: true,
          query: searchQuery,
        },
      },
    ];

    const countResult = await Business.aggregate([
      ...pipeline,
      { $count: "total" },
    ]);

    total = countResult[0]?.total || 0;

    const results = await Business.aggregate([
      ...pipeline,
      { $skip: (pageNum - 1) * limitNum },
      { $limit: limitNum },
    ]);

    const userLocation =
      lat && lng ? { lat: Number(lat), lng: Number(lng) } : null;

    businesses = await rankBusinesses(
      results.map(normalizeBusiness),
      userLocation,
      correctedKeyword,
      intent,
      req.user?._id || null,
      city
    );
  } else {
    const raw = await Business.find(searchQuery)
      .lean()
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    total = await Business.countDocuments(searchQuery);

    businesses = await rankBusinesses(
      raw.map(normalizeBusiness),
      null,
      correctedKeyword,
      intent,
      req.user?._id || null,
      city
    );
  }

  const response = {
    success: true,
    businesses,
    total,
    page: pageNum,
    pages: Math.ceil(total / limitNum),
  };

  res.json(response);
});