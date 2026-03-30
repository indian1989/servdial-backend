import Business from "../../models/Business.js";
import BusinessClick from "../../models/BusinessClick.js";
import mongoose from "mongoose";
import { computeFinalScore } from "../search/fusionScore.js";

export async function unifiedRanking(context = {}) {
  const { city, category, keyword, limit = 12 } = context;

  const safeLimit = Math.min(Number(limit) || 12, 50);

  // ================= MATCH =================
  const match = { status: "approved" };

  if (city) {
    match.city = city;
  }

  if (category && mongoose.Types.ObjectId.isValid(category)) {
    const catId = new mongoose.Types.ObjectId(category);
    match.$or = [
      { categoryId: catId },
      { secondaryCategories: catId },
      { parentCategoryId: catId },
    ];
  }

  // ================= FETCH BASE =================
  const poolSize = city ? 200 : 300;

  const businesses = await Business.find(match)
    .select(
      "_id name slug city averageRating totalReviews views isFeatured featurePriority createdAt tags"
    )
    .limit(poolSize)
    .lean();

  if (!businesses.length) return [];

  const businessIds = businesses.map((b) => b._id);

  // ================= CLICK AGG =================
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

  const q = (keyword || "").toLowerCase().trim();

  // ================= SCORING =================
  const scored = businesses.map((b) => {
    const id = b._id.toString();

    const rating = b.averageRating || 0;
    const reviews = b.totalReviews || 0;
    const views = b.views || 0;
    const clicks = clickMap[id] || 0;

    const daysOld =
      (Date.now() - new Date(b.createdAt).getTime()) /
      (1000 * 60 * 60 * 24);

    // =====================================================
    // 🚨 NEW: QUERY AFFINITY SCORE (CRITICAL FIX)
    // =====================================================

    const name = (b.name || "").toLowerCase();
    const tags = (b.tags || []).join(" ").toLowerCase();

    let queryScore = 0;

    if (q) {
      if (name === q) {
        queryScore = 100; // EXACT MATCH
      } else if (name.includes(q)) {
        queryScore = 60; // PARTIAL NAME MATCH
      } else if (tags.includes(q)) {
        queryScore = 30; // TAG MATCH
      }
    }

    // ================= BASE SIGNALS =================
    const ratingScore = rating;
    const clickScore = Math.log10(clicks + 1);
    const trendingScore = clicks > 10 ? 1 : 0;
    const distanceScore = 0;

    const vectorScore = 0.2;
    const keywordScore = 0.2;

    const baseScore = computeFinalScore({
      vectorScore,
      keywordScore,
      trendingScore,
      clickScore,
      ratingScore,
      distanceScore,
    });

    // ================= BOOSTS =================
    let boost =
      (b.isFeatured ? 5 : 0) +
      (b.featurePriority || 0) * 2 +
      Math.log10(views + 1) * 2 +
      Math.log10(reviews + 1);

    if (daysOld < 30) boost += 2;

    // =====================================================
    // 🚨 FINAL FIX: QUERY SCORE DOMINANCE
    // =====================================================
    const finalScore = baseScore + boost + queryScore * 5;

    return {
      ...b,
      finalScore,
      queryScore,
    };
  });

  // ================= SORT =================
  scored.sort((a, b) => b.finalScore - a.finalScore);

  return scored.slice(0, safeLimit);
}