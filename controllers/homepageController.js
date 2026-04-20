// backend/controllers/homepageController.js
import asyncHandler from "express-async-handler";
import Category from "../models/Category.js";
import Business from "../models/Business.js";
import City from "../models/City.js";
import { resolveCity } from "../services/cityResolver.js";
import { rankBusinesses } from "../utils/rankBusinesses.js";

// ================= HOMEPAGE CONTROLLER =================
export const getHomepageData = asyncHandler(async (req, res) => {
  const { city, lat, lng } = req.query;

  // ================= CITY RESOLUTION =================
  let cityDoc = null;
let cityFilter = {};

if (city) {
  cityDoc = await resolveCity({ citySlug: city });

  if (cityDoc) {
    cityFilter.cityId = cityDoc._id;
  }
}

  // ================= BASE FILTER =================
  const baseBusinessFilter = {
    status: "approved",
    isDeleted: false,
    ...cityFilter,
  };

  // ================= DATA FETCH =================
  const [
    categories,
    featuredBusinesses,
    topRatedBusinesses,
    latestBusinesses,
    nearbyBusinesses,
    recommendedBusinesses,
    cities,
  ] = await Promise.all([
    Category.find({ status: "active" })
      .select("name slug icon parentCategory order")  
      .sort({ level: 1, order: 1, name: 1 })
      .limit(12)
      .lean(),

    Business.find(baseBusinessFilter)
      .select("name slug averageRating views isFeatured featurePriority")
      .sort({ featurePriority: -1, averageRating: -1 })
      .limit(8)
      .lean(),

    Business.find(baseBusinessFilter)
      .select("name slug averageRating views isFeatured featurePriority")
      .sort({ averageRating: -1, totalReviews: -1 })
      .limit(8)
      .lean(),

    Business.find(baseBusinessFilter)
      .select("name slug averageRating views isFeatured featurePriority")
      .sort({ createdAt: -1 })
      .limit(8)
      .lean(),

    lat && lng
      ? Business.aggregate([
          {
            $geoNear: {
              near: {
                type: "Point",
                coordinates: [Number(lng), Number(lat)],
              },
              distanceField: "distance",
              spherical: true,
              maxDistance: 5000,
            },
          },
          {
  $match: {
    status: "approved",
    isDeleted: false,
    ...(cityFilter.cityId && { cityId: cityFilter.cityId })
  }
},
          { $limit: 8 },
        ])
      : [],

    (async () => {
  const businesses = await Business.find(baseBusinessFilter)
    .select("name slug averageRating views isFeatured featurePriority")
    .limit(30)
    .lean();

  return await rankBusinesses(
    businesses,
    lat && lng ? { lat: Number(lat), lng: Number(lng) } : null,
    "",
    { recommendation: true },
    req.user?._id || null,
    cityDoc?._id || null
  );
})(),

    City.find({ popular: true, status: active })
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
    data: {
      categories,
      featuredBusinesses,
      topRatedBusinesses,
      latestBusinesses,
      nearbyBusinesses: formattedNearby,
      recommendedBusinesses,
      cities,
    }
  });
});