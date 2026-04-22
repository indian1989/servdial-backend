// backend/services/ranking/unifiedRankingEngine.js
import Business from "../../models/Business.js";
import BusinessClick from "../../models/BusinessClick.js";
import mongoose from "mongoose";
import { computeFinalScore } from "../search/fusionScore.js";
import { parseSearchIntent } from "../../utils/parseSearchIntent.js";
import { resolveCity } from "../cityResolver.js";

/* ================= DISTANCE ================= */
function getDistanceKm(coords, lat, lng) {
  if (!coords || lat == null || lng == null) return null;

  const [bLng, bLat] = coords;

  const R = 6371;
  const dLat = ((bLat - lat) * Math.PI) / 180;
  const dLng = ((bLng - lng) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat * Math.PI) / 180) *
      Math.cos((bLat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;

  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

/* ================= MAIN ================= */
export async function unifiedRanking(context = {}) {
  const {
    q,
    candidates = [],
    citySlug,
    cityName,
    lat,
    lng,
    category,
    limit = 12,
  } = context;

  /* ================= SCORE MAP ================= */
  const scoreMap = {};
  if (candidates.length > 0) {
    candidates.forEach((c) => {
      scoreMap[c._id.toString()] = {
        vectorScore: c.vectorScore || 0,
        keywordScore: c.keywordScore || 0,
      };
    });
  }

  /* ================= CITY RESOLUTION ================= */
  let resolvedCity = null;

  if (citySlug || cityName || (lat && lng)) {
    resolvedCity = await resolveCity({
      citySlug,
      cityName,
      latitude: lat,
      longitude: lng,
    });
  }

  /* ================= MATCH ================= */
  const match = { status: "approved" };

  // 🔥 CANDIDATE FILTER
  if (candidates.length > 0) {
    match._id = {
      $in: candidates.map((c) => c._id),
    };
  }

  // 🔥 CITY FILTER (STRICT BLUEPRINT)
  if (resolvedCity?._id) {
    match.cityId = new mongoose.Types.ObjectId(resolvedCity._id);
  }

  // 🔥 CATEGORY FILTER
  if (category && mongoose.Types.ObjectId.isValid(category)) {
    const catId = new mongoose.Types.ObjectId(category);

    match.$or = [
      { categoryId: catId },
      { parentCategoryId: catId },
    ];
  }

  /* ================= FETCH ================= */
  const fetchLimit = Math.min(
    Math.max(Number(limit) * 5, 50),
    150
  );

  const businesses = await Business.find(match)
    .select(`
      _id name slug
      averageRating totalReviews views
      isFeatured featurePriority
      createdAt tags location
      categoryId parentCategoryId
      phone images logo isVerified businessHours
    `)
    .limit(fetchLimit)
    .lean();

  if (!businesses.length) return [];

  const businessIds = businesses.map((b) => b._id);

  /* ================= CLICK DATA ================= */
  const last7Days = new Date();
  last7Days.setDate(last7Days.getDate() - 7);

  const clickAgg = await BusinessClick.aggregate([
    {
      $match: {
        business: { $in: businessIds },
        createdAt: { $gte: last7Days },
      },
    },
    {
      $group: {
        _id: "$business",
        clickScore: { $sum: 1 },
      },
    },
  ]);

  const clickMap = {};
  clickAgg.forEach((c) => {
    clickMap[c._id.toString()] = c.clickScore;
  });

  /* ================= INTENT ================= */
  const parsedIntent = q ? parseSearchIntent(q) : {};

  /* ================= SCORING ================= */
  const scored = businesses.map((b) => {
    const id = b._id.toString();

    const clicks = clickMap[id] || 0;

    const baseScores = scoreMap[id] || {};
    const vectorScore = baseScores.vectorScore || 0;
    const keywordScore = baseScores.keywordScore || 0;

    /* FEATURE SCORE */
    const featureScore =
      (b.isFeatured ? 1 : 0) + (b.featurePriority || 0) * 0.2;

    /* DISTANCE SCORE */
    const distanceKm = getDistanceKm(
      b.location?.coordinates,
      lat,
      lng
    );

    let distanceScore = 0;

    if (distanceKm !== null) {
      distanceScore = Math.exp(-distanceKm / 10);

      if (parsedIntent?.nearMe) distanceScore *= 2;
      if (parsedIntent?.isEmergency) distanceScore *= 3;
    }

    /* RATING SCORE */
const averageRating = b.averageRating || 0;
const totalReviews = b.totalReviews || 0;

    /* FINAL SCORE */
    const score = computeFinalScore({
  vectorScore,
  keywordScore,
  trendingScore: clicks > 10 ? 1 : 0,
  clickScore: Math.log2(clicks + 1),
  distanceScore,

  // 🔥 CLEAN INPUTS
  averageRating,
  totalReviews
});

let finalScore = score;

// ✅ feature boost (clean layer)
if (b.isFeatured) {
  finalScore += 0.08 + (b.featurePriority || 0) * 0.02;
}

let penalty = 0;

// 🚨 low rating + low reviews
if (averageRating < 2.5 && totalReviews < 5) {
  penalty -= 40;
}

// 🚨 tag stuffing
if ((b.tags || []).length > 20) {
  penalty -= 15;
}

  return {
  ...b,
  qualityScore: finalScore + penalty,
  distanceKm,
};
  });

  /* ================= SORT ================= */
  scored.sort((a, b) => b.qualityScore - a.qualityScore);

// 🔥 DIVERSITY CONTROL
const diversified = [];
const categoryCount = {};

for (let biz of scored) {
  const cat =
    biz.categoryId?.toString() ||
    biz.parentCategoryId?.toString() ||
    "other";

  categoryCount[cat] = categoryCount[cat] || 0;

  if (categoryCount[cat] < 3) {
    diversified.push(biz);
    categoryCount[cat]++;
  }
}

if (diversified.length < scored.length) {
  const remaining = scored.filter(
    (b) => !diversified.includes(b)
  );
  diversified.push(...remaining);
}

return diversified.slice(0, Number(limit) || 12);
}