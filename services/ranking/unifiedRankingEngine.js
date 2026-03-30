import Business from "../../models/Business.js";
import BusinessClick from "../../models/BusinessClick.js";
import mongoose from "mongoose";
import { computeFinalScore } from "../search/fusionScore.js";

export async function unifiedRanking(context = {}) {
  const { city, category, limit = 50 } = context;

  const safeLimit = Math.min(Number(limit) || 50, 100);

  // ================= MATCH =================
  const match = { status: "approved" };

  if (city) match.city = city;

  if (category && mongoose.Types.ObjectId.isValid(category)) {
    const catId = new mongoose.Types.ObjectId(category);
    match.$or = [
      { categoryId: catId },
      { secondaryCategories: catId },
      { parentCategoryId: catId },
    ];
  }

  // ================= FETCH LARGE POOL =================
  const businesses = await Business.find(match)
    .select(
      "_id name slug city averageRating totalReviews views isFeatured featurePriority createdAt tags location"
    )
    .limit(city ? 300 : 400)
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

  // ================= SCORING =================
  const enriched = businesses.map((b) => {
    const id = b._id.toString();
    const clicks = clickMap[id] || 0;

    const baseScore = computeFinalScore({
      vectorScore: 0.2,
      keywordScore: 0.2,
      trendingScore: clicks > 10 ? 1 : 0,
      clickScore: Math.log10(clicks + 1),
      ratingScore: b.averageRating || 0,
      distanceScore: 0,
    });

    // BOOSTS
    let boost =
      (b.isFeatured ? 5 : 0) +
      (b.featurePriority || 0) * 2 +
      Math.log10((b.views || 0) + 1) * 2 +
      Math.log10((b.totalReviews || 0) + 1);

    const daysOld =
      (Date.now() - new Date(b.createdAt).getTime()) /
      (1000 * 60 * 60 * 24);

    if (daysOld < 30) boost += 2;

    return {
      ...b,
      finalScore: baseScore + boost,
    };
  });

  // ================= ✅ CRITICAL FIX =================
  // SORT BEFORE SLICE
  enriched.sort((a, b) => b.finalScore - a.finalScore);

  // ================= RETURN =================
  return enriched.slice(0, safeLimit);
}