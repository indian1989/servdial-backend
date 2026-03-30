import asyncHandler from "express-async-handler";
import Category from "../models/Category.js";
import Business from "../models/Business.js";
import City from "../models/City.js";

// ================= NORMALIZE CITY =================
const normalizeCity = (city) => {
  if (!city) return null;

  return city
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
};

// ================= HOMEPAGE DATA =================
export const getHomepageData = asyncHandler(async (req, res) => {
  const { city, lat, lng } = req.query;

  // ================= NORMALIZED CITY =================
  const normalizedCity = normalizeCity(city);

  const cityFilter = normalizedCity
    ? { city: new RegExp(`^${normalizedCity}$`, "i") }
    : {};

  // ================= FETCH DATA =================
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
    Category.find({ status: "active" })
      .sort({ name: 1 })
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
      .select(
        "name slug city images averageRating totalReviews phone whatsapp isFeatured isVerified"
      )
      .lean(),

    // ================= TOP RATED =================
    Business.find({
      status: "approved",
      ...cityFilter,
    })
      .sort({ averageRating: -1, totalReviews: -1 })
      .limit(8)
      .select(
        "name slug city images averageRating totalReviews phone whatsapp isVerified"
      )
      .lean(),

    // ================= LATEST =================
    Business.find({
      status: "approved",
      ...cityFilter,
    })
      .sort({ createdAt: -1 })
      .limit(8)
      .select(
        "name slug city images averageRating totalReviews phone whatsapp isNew isVerified"
      )
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
              maxDistance: 5000, // 5km
              spherical: true,
            },
          },
          {
            $match: {
              status: "approved",
            },
          },
          {
            $limit: 8,
          },
        ])
      : [],

    // ================= RECOMMENDED =================
    Business.find({
      status: "approved",
      ...cityFilter,
    })
      .sort({ views: -1, averageRating: -1 })
      .limit(8)
      .select(
        "name slug city images averageRating totalReviews phone whatsapp isVerified"
      )
      .lean(),

    // ================= POPULAR CITIES =================
    City.find({ isPopular: true, status: "active" })
      .sort({ name: 1 })
      .limit(8)
      .lean(),
  ]);

  // ================= FORMAT NEARBY =================
  const formattedNearby = nearbyBusinesses.map((b) => ({
    ...b,
    distance: b.distance ? Number((b.distance / 1000).toFixed(1)) : null,
  }));

  // ================= RESPONSE =================
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