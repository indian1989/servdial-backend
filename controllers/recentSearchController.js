import RecentSearch from "../models/RecentSearch.js";
import asyncHandler from "express-async-handler";

/* ================= GET RECENT ================= */
export const getRecentSearches = asyncHandler(async (req, res) => {
  const userId = req.user?._id;

  if (!userId) {
    return res.json({
      success: true,
      searches: [],
    });
  }

  const searches = await RecentSearch.find({ user: userId })
    .sort({ lastSearchedAt: -1 })
    .limit(10)
    .lean();

  res.json({
    success: true,
    searches,
  });
});