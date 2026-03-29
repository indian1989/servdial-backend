import SearchTrend from "../models/SearchTrend.js";
import asyncHandler from "express-async-handler";

/* ================= GET GLOBAL TRENDS ================= */
export const getTrendingSearches = asyncHandler(async (req, res) => {
  const { city, category } = req.query;

  const match = {};

  if (city) match.city = city;
  if (category) match.category = category;

  const trends = await SearchTrend.aggregate([
    { $match: match },
    {
      $group: {
        _id: "$query",
        count: { $sum: "$count" },
      },
    },
    { $sort: { count: -1 } },
    { $limit: 10 },
  ]);

  res.json({
    success: true,
    trends: trends.map((t) => ({
      query: t._id,
      count: t.count,
    })),
  });
});