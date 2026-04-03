// backend/services/ranking/unifiedRankingEngine.js
import Business from "../../models/Business.js";
import BusinessClick from "../../models/BusinessClick.js";
import mongoose from "mongoose";
import { computeFinalScore } from "../search/fusionScore.js";

/**
 * Calculate real distance between two geo points (Haversine formula)
 */
function getDistanceKm(coords, lat, lng) {
  if (!coords || !lat || !lng) return null;

  const [bLng, bLat] = coords;

  const R = 6371; // Earth radius in km
  const dLat = ((bLat - lat) * Math.PI) / 180;
  const dLng = ((bLng - lng) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat * Math.PI) / 180) *
      Math.cos((bLat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;

  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

/**
 * Detect search intent for smarter ranking
 */
function detectIntent(context) {
  const q = (context.q || "").toLowerCase();

  return {
    isNearMe: q.includes("near") || q.includes("near me"),
    isBest: q.includes("best"),
    isEmergency: q.includes("emergency") || q.includes("urgent"),
  };
}

/**
 * Unified Ranking Engine (Production Grade)
 */
export async function unifiedRanking(context = {}) {
  const {
    city,
    category,
    limit = 12,
    lat,
    lng,
  } = context;

  const match = { status: "approved" };

  // ================= CITY FILTER =================
  if (city) {
    match.city = new RegExp(city, "i");
  }

  // ================= CATEGORY FILTER =================
  if (category) {
    if (mongoose.Types.ObjectId.isValid(category)) {
      const catId = new mongoose.Types.ObjectId(category);

      match.$or = [
        { categoryId: catId },
        { secondaryCategories: catId },
        { parentCategoryId: catId },
      ];
    } else {
      match.$or = [
        { tags: { $regex: new RegExp(category, "i") } },
      ];
    }
  }

  // ================= FETCH LIMIT =================
  const fetchLimit = Math.max(limit * 5, city ? 200 : 300);

  const businesses = await Business.find(match)
    .select(`
      _id name slug city averageRating totalReviews views
      isFeatured featurePriority createdAt tags location
      categoryId parentCategoryId secondaryCategories
      phone images logo isVerified
    `)
    .limit(fetchLimit)
    .lean();

  if (!businesses.length) return [];

  const businessIds = businesses.map((b) => b._id);

  // ================= CLICK DATA =================
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

  // ================= INTENT =================
  const intent = detectIntent(context);

  // ================= SCORING =================
  const scored = businesses.map((b) => {
    const id = b._id.toString();
    const clicks = clickMap[id] || 0;

    const featureScore =
      (b.isFeatured ? 1 : 0) + (b.featurePriority || 0) * 0.2;

    // ================= DISTANCE SCORE =================
    const distanceKm = getDistanceKm(
      b.location?.coordinates,
      lat,
      lng
    );

    let distanceScore = 0;

    if (distanceKm !== null) {
      // exponential decay (Google-like behavior)
      distanceScore = Math.exp(-distanceKm / 10);

      // intent boost
      if (intent.isNearMe) distanceScore *= 2;
      if (intent.isEmergency) distanceScore *= 3;
    }

    // ================= FINAL FUSION SCORE =================
    const score = computeFinalScore({
      vectorScore: 0.2,
      keywordScore: 0.2,
      trendingScore: clicks > 10 ? 1 : 0,
      clickScore: Math.log10(clicks + 1),
      ratingScore: b.averageRating || 0,
      featureScore,
      distanceScore,
    });

    return {
      ...b,
      qualityScore: score,
      distanceKm,
    };
  });

  // ================= SORT =================
  scored.sort((a, b) => b.qualityScore - a.qualityScore);

  // ================= RETURN =================
  return scored.slice(0, Number(limit) || 12);
}