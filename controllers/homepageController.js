import mongoose from "mongoose";
import asyncHandler from "express-async-handler";
import Category from "../models/Category.js";
import Business from "../models/Business.js";
import City from "../models/City.js";
import { resolveCity } from "../services/resolver/cityResolver.js";
import { rankBusinesses } from "../utils/rankBusinesses.js";
import { buildCategoryTree } from "../utils/buildCategoryTree.js";

// ================= HOMEPAGE CONTROLLER =================
export const getHomepageData = asyncHandler(async (req, res) => {
  const { city, lat, lng } = req.query;

  // ================= CITY RESOLUTION =================
  let cityDoc = null;
  let cityFilter = {};

  if (city) {
    cityDoc = await resolveCity({ citySlug: city });

    // allow global scope for "india"
    if (!cityDoc && city !== "india") {
      return res.status(404).json({
        success: false,
        message: "City not found",
      });
    }

    if (cityDoc) {
      cityFilter.cityId = cityDoc._id; // ✅ NO unnecessary ObjectId wrapping
    }
  }

  // ================= BASE FILTER =================
  const baseBusinessFilter = {
    status: "approved",
    isDeleted: false,
    ...cityFilter,
  };

  const baseSelect =
    "name slug averageRating totalReviews views isFeatured featurePriority";

  const safeLocation =
    lat && lng ? { lat: Number(lat), lng: Number(lng) } : {};

  const safeContext = { intent: "homepage" };

  // ================= PARALLEL FETCH =================
  const [
    categories,
    featuredRaw,
    topRatedRaw,
    latestRaw,
    nearbyRaw,
    recommendedRaw,
    cities,
  ] = await Promise.all([
    // ================= CATEGORIES =================
    Category.find({
      status: "active",
      parentCategory: null,
    })
      .select("name slug icon order")
      .sort({ order: 1, name: 1 })
      .limit(20)
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
              key: "location",
            },
          },
          {
            $match: baseBusinessFilter,
          },
          { $limit: 20 },
        ])
      : [],

    // ================= RECOMMENDED =================
    Business.find(baseBusinessFilter)
      .select(baseSelect)
      .limit(40)
      .lean(),

    // ================= POPULAR CITIES =================
    City.find({
      popular: true,
      status: "active",
    })
      .sort({ name: 1 })
      .limit(8)
      .lean(),
  ]);

  // ================= RANKING =================
  const [
    rankedFeatured,
    rankedTopRated,
    rankedLatest,
    rankedRecommended,
  ] = await Promise.all([
    rankBusinesses(
      featuredRaw,
      safeLocation,
      "",
      safeContext,
      req.user?._id || null,
      cityDoc?._id || null
    ),
    rankBusinesses(
      topRatedRaw,
      safeLocation,
      "",
      safeContext,
      req.user?._id || null,
      cityDoc?._id || null
    ),
    rankBusinesses(
      latestRaw,
      safeLocation,
      "",
      safeContext,
      req.user?._id || null,
      cityDoc?._id || null
    ),
    rankBusinesses(
      recommendedRaw,
      safeLocation,
      "",
      { recommendation: true },
      req.user?._id || null,
      cityDoc?._id || null
    ),
  ]);

  // ================= FORMAT NEARBY =================
  const formattedNearby = (nearbyRaw || []).map((b) => ({
    ...b,
    distance: b.distance
      ? Number((b.distance / 1000).toFixed(1))
      : null,
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
      recommendedBusinesses: rankedRecommended.slice(0, 8),
      cities,
    },
    meta: {
      city: cityDoc
        ? { name: cityDoc.name, slug: cityDoc.slug }
        : null,
    },
  });
});