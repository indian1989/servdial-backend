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
    cityDoc = await resolveCity(city);

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

console.log("🔥 BASE FILTER:", baseBusinessFilter);

// 👇 ADD THIS NEXT
const testCount = await Business.countDocuments(baseBusinessFilter);
console.log("🔥 MATCHING BUSINESSES:", testCount);

  const baseSelect = `
  name
  slug
  logo
  images
  averageRating
  totalReviews
  views
  phoneClicks
  whatsappClicks
  phone
  whatsapp
  isFeatured
  featurePriority
  isVerified
  citySlug
  categorySlug
`;
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
    Business.find({
  ...baseBusinessFilter,
  isFeatured: true,
})
  .select(baseSelect)
  .populate("cityId", "name slug")
.populate("categoryId", "name slug")
  .sort({ featurePriority: -1, averageRating: -1 })
  .limit(20)
  .lean(),

    // ================= TOP RATED =================
    Business.find(baseBusinessFilter)
  .select(baseSelect)
  .populate("cityId", "name slug")
.populate("categoryId", "name slug")
  .sort({ averageRating: -1, totalReviews: -1 })
  .limit(20)
  .lean(),

    // ================= LATEST =================
    Business.find(baseBusinessFilter)
  .select(baseSelect)
  .populate("cityId", "name slug")
.populate("categoryId", "name slug")
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

          query: {
            status: "approved",
            isDeleted: false,
            ...cityFilter,
          },
        },
      },

      // IMPORTANT: bring full data needed for frontend
      {
        $lookup: {
          from: "categories",
          localField: "categoryId",
          foreignField: "_id",
          as: "categoryId",
        },
      },
      {
        $unwind: {
          path: "$categoryId",
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $lookup: {
          from: "cities",
          localField: "cityId",
          foreignField: "_id",
          as: "cityId",
        },
      },
      {
        $unwind: {
          path: "$cityId",
          preserveNullAndEmptyArrays: true,
        },
      },

      {
  $project: {
    name: 1,
    slug: 1,
    logo: 1,
    images: 1,
    averageRating: 1,
    totalReviews: 1,
    views: 1,
    phoneClicks: 1,
    whatsappClicks: 1,
    phone: 1,
    whatsapp: 1,
    isFeatured: 1,
    featurePriority: 1,
    isVerified: 1,
    citySlug: 1,
    categorySlug: 1,
    cityId: 1,
    categoryId: 1,
    distance: 1,
  },
},

      { $limit: 20 },
    ])
  : [],

    // ================= RECOMMENDED =================
    Business.find(baseBusinessFilter)
  .select(baseSelect)
  .populate("cityId", "name slug")
.populate("categoryId", "name slug")
  .limit(40)
  .lean(),

    // ================= FEATURED CITIES =================
    City.find({
      isFeatured: true,
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