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

  // ✅ IMPORTANT FIX
  if (!cityDoc && city === "india") {
    cityDoc = null; // allow global data
  } else if (!cityDoc) {
    return res.status(404).json({
      success: false,
      message: "City not found",
    });
  }

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

  // ================= COMMON SELECT =================
  const baseSelect =
    "name slug averageRating totalReviews views isFeatured featurePriority";

  // ================= DATA FETCH =================
  const [
    categories,
    featuredRaw,
    topRatedRaw,
    latestRaw,
    nearbyRaw,
    recommendedBusinesses,
    cities,
  ] = await Promise.all([
    // ================= CATEGORIES =================
    Category.find({ status: "active" })
      .select("name slug icon parentCategory order")
      .sort({ level: 1, order: 1, name: 1 })
      .limit(12)
      .lean(),

    // ================= FEATURED =================
    Business.find(baseBusinessFilter)
      .select(baseSelect)
      .sort({ featurePriority: -1, averageRating: -1 })
      .limit(20)
      .lean(),

    // ================= TOP RATED =================
    Business.find(baseBusinessFilter)
      .select(baseSelect)
      .sort({ averageRating: -1, totalReviews: -1 })
      .limit(20)
      .lean(),

    // ================= LATEST =================
    Business.find(baseBusinessFilter)
      .select(baseSelect)
      .sort({ createdAt: -1 })
      .limit(20)
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
  spherical: true,
  maxDistance: 5000,
  key: "location", // 🔥 CRITICAL FIX
},
          },
          {
            $match: {
              status: "approved",
              isDeleted: false,
              ...(cityFilter.cityId && { cityId: cityFilter.cityId }),
            },
          },
          { $limit: 20 },
        ])
      : [],

    // ================= RECOMMENDED =================
    (async () => {
      const businesses = await Business.find(baseBusinessFilter)
        .select(baseSelect)
        .limit(40)
        .lean();

      return await rankBusinesses(
  businesses,
  lat && lng ? { lat: Number(lat), lng: Number(lng) } : {}, // 🔥 NEVER null
  "",
  { recommendation: true },
  req.user?._id || null,
  cityDoc?._id || null
);
    })(),

    // ================= POPULAR CITIES =================
    City.find({ popular: true, status: "active" })
      .sort({ name: 1 })
      .limit(8)
      .lean(),
  ]);

  // ================= APPLY RANKING (CONSISTENCY FIX) =================
  const rankedFeatured = await rankBusinesses(
    featuredRaw,
    null,
    "",
    {},
    req.user?._id || null,
    cityDoc?._id || null
  );

  const rankedTopRated = await rankBusinesses(
    topRatedRaw,
    null,
    "",
    {},
    req.user?._id || null,
    cityDoc?._id || null
  );

  const rankedLatest = await rankBusinesses(
    latestRaw,
    null,
    "",
    {},
    req.user?._id || null,
    cityDoc?._id || null
  );

  // ================= FORMAT NEARBY =================
  const formattedNearby = nearbyRaw.map((b) => ({
    ...b,
    distance: b.distance ? Number((b.distance / 1000).toFixed(1)) : null,
  }));

  // ================= RESPONSE =================
  res.json({
    success: true,
    data: {
      categories,
      featuredBusinesses: rankedFeatured.slice(0, 8),
      topRatedBusinesses: rankedTopRated.slice(0, 8),
      latestBusinesses: rankedLatest.slice(0, 8),
      nearbyBusinesses: formattedNearby.slice(0, 8),
      recommendedBusinesses: recommendedBusinesses.slice(0, 8),
      cities,
    },
    meta: {
      city: cityDoc
        ? { name: cityDoc.name, slug: cityDoc.slug }
        : null,
    },
  });
});