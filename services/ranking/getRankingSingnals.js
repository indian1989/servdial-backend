import BusinessClick from "../../models/BusinessClick.js";
import Business from "../../models/Business.js";

/**
 * Batch Ranking Signals Fetcher (NO N+1)
 * @param {Array<ObjectId>} businessIds
 * @returns {Object} { [id]: { trendingScore, clickScore, ratingScore, distanceScore } }
 */
export default async function getRankingSignals(businessIds = []) {
  if (!businessIds.length) return {};

  // ================= LAST 7 DAYS =================
  const last7Days = new Date();
  last7Days.setDate(last7Days.getDate() - 7);

  // ================= CLICK AGG =================
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

  // ================= FETCH BUSINESS DATA =================
  const businesses = await Business.find({
    _id: { $in: businessIds },
  })
    .select("averageRating totalReviews")
    .lean();

  const result = {};

  businesses.forEach((b) => {
    const id = b._id.toString();
    const clicks = clickMap[id] || 0;

    result[id] = {
      clickScore: Math.log10(clicks + 1),
      trendingScore: clicks > 10 ? 1 : 0,
      ratingScore: b.averageRating || 0,
      distanceScore: 0, // will be injected later if needed
    };
  });

  return result;
}