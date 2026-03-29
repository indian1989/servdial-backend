import Business from "../../models/Business.js";
import BusinessClick from "../../models/BusinessClick.js";
import mongoose from "mongoose";
import { computeFinalScore } from "../search/fusionScore.js";

export async function unifiedRanking(context = {}) {
  const { city, category, limit = 12 } = context;

  const safeLimit = Math.min(Number(limit) || 12, 50);

  // ================= MATCH =================
  const match = { status: "approved" };

  // ✅ INDEX-FRIENDLY CITY FILTER
  if (city) {
    match.city = city; // exact match (fast)
  }

  if (category && mongoose.Types.ObjectId.isValid(category)) {
    const catId = new mongoose.Types.ObjectId(category);
    match.$or = [
      { categoryId: catId },
      { secondaryCategories: catId },
      { parentCategoryId: catId },
    ];
  }

  // ================= DYNAMIC POOL SIZE =================
  const poolSize = city ? 200 : 300;

  // ================= FETCH BASE =================
  const businesses = await Business.find(match)
    .select(
      "_id name slug city averageRating totalReviews views isFeatured featurePriority createdAt"
    )
    .limit(poolSize)
    .lean();

  // ✅ EDGE CASE: NO DATA
  if (!businesses.length) {
    return [];
  }

  const businessIds = businesses.map((b) => b._id);

  // ================= BULK CLICK AGG =================
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

    // normalized signals
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

    // boosts
    let boost =
      (b.isFeatured ? 5 : 0) +
      (b.featurePriority || 0) * 2 +
      Math.log10(views + 1) * 2 +
      Math.log10(reviews + 1);

    if (daysOld < 30) boost += 2;

    return {
      ...b,
      finalScore: baseScore + boost,
    };
  });

  // ================= SORT =================
  scored.sort((a, b) => b.finalScore - a.finalScore);

  return scored.slice(0, safeLimit);
}