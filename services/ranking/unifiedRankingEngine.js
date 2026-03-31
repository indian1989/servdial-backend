import Business from "../../models/Business.js";
import BusinessClick from "../../models/BusinessClick.js";
import mongoose from "mongoose";
import { computeFinalScore } from "../search/fusionScore.js";

export async function unifiedRanking(context = {}) {
  const { city, category, limit = 12 } = context;

  const match = { status: "approved" };

  // ================= CITY FILTER (FIXED) =================
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

  // ================= FETCH LIMIT FIX =================
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

  // ================= SCORING =================
  const scored = businesses.map((b) => {
    const id = b._id.toString();
    const clicks = clickMap[id] || 0;

    const featureScore =
      (b.isFeatured ? 1 : 0) + (b.featurePriority || 0) * 0.2;

    const distanceScore = b.location?.coordinates ? 0.1 : 0;

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
    };
  });

  // ================= SORT =================
  scored.sort((a, b) => b.qualityScore - a.qualityScore);

  return scored.slice(0, Number(limit) || 12);
}