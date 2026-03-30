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

  // ================= FETCH =================
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

  // ================= QUALITY SCORING ONLY =================
  const enriched = businesses.map((b) => {
    const id = b._id.toString();
    const clicks = clickMap[id] || 0;

    const score = computeFinalScore({
      vectorScore: 0.2,
      keywordScore: 0.2,
      trendingScore: clicks > 10 ? 1 : 0,
      clickScore: Math.log10(clicks + 1),
      ratingScore: b.averageRating || 0,
      distanceScore: 0,
    });

    return {
      ...b,
      qualityScore: score,
    };
  });

  return enriched.slice(0, safeLimit);
}