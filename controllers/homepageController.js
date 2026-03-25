import asyncHandler from "express-async-handler";
import Category from "../models/Category.js";
import Business from "../models/Business.js";
import City from "../models/City.js";

// ================= HOMEPAGE DATA =================
export const getHomepageData = asyncHandler(async (req, res) => {
  const { city, lat, lng } = req.query;

  const cityFilter = city
    ? { city: new RegExp(`^${city}$`, "i") }
    : {};

  const [
    categories,
    featuredBusinesses,
    topRatedBusinesses,
    latestBusinesses,
    nearbyBusinesses,
    recommendedBusinesses,
    cities,
  ] = await Promise.all([

    // ================= CATEGORIES =================
    Category.find({ status: "active" }) // ✅ FIXED (not isActive)
      .limit(12)
      .lean(),

    // ================= FEATURED =================
    Business.find({
      isFeatured: true,
      status: "approved",
      ...cityFilter,
    })
      .sort({ featurePriority: -1, averageRating: -1 })
      .limit(8)
      .select("name slug city image averageRating")
      .lean(),

    // ================= TOP RATED =================
    Business.find({
      status: "approved",
      ...cityFilter,
    })
      .sort({ averageRating: -1 })
      .limit(8)
      .select("name slug city image averageRating")
      .lean(),

    // ================= LATEST =================
    Business.find({
      status: "approved",
      ...cityFilter,
    })
      .sort({ createdAt: -1 })
      .limit(8)
      .select("name slug city image averageRating")
      .lean(),

    // ================= NEARBY =================
    lat && lng
      ? Business.aggregate([
          {
            $geoNear: {
              near: {
                type: "Point",
                coordinates: [Number(lng), Number(lat)],
              },
              distanceField: "distance",
              maxDistance: 5000,
              spherical: true,
            },
          },
          { $match: { status: "approved" } },
          { $limit: 8 },
        ])
      : [],

    // ================= RECOMMENDED =================
    Business.find({
      status: "approved",
      ...cityFilter,
    })
      .sort({ views: -1, averageRating: -1 })
      .limit(8)
      .select("name slug city image averageRating")
      .lean(),

    // ================= POPULAR CITIES =================
    City.find({ isPopular: true })
      .sort({ name: 1 })
      .limit(8)
      .lean(),
  ]);

  // ================= FORMAT NEARBY =================
  const formattedNearby = nearbyBusinesses.map((b) => ({
    ...b,
    distance: b.distance ? b.distance / 1000 : null,
  }));

  res.json({
    success: true,
    categories,
    featuredBusinesses,
    topRatedBusinesses,
    latestBusinesses,
    nearbyBusinesses: formattedNearby,
    recommendedBusinesses,
    cities,
  });
});