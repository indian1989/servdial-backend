// backend/controllers/businessController.js

import Business from "../models/Business.js";
import asyncHandler from "express-async-handler";
import { uploadImage } from "../utils/uploadToCloudinary.js";
import { buildSearchQuery } from "../utils/buildSearchQuery.js";

// ================= Role Check =================
const isAdmin = (user) => ["admin", "superadmin"].includes(user.role);

// ================= CREATE Business =================
export const createBusiness = asyncHandler(async (req, res) => {
  if (!["provider", "admin", "superadmin"].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: "Not authorized to create business",
    });
  }

  const ownerId = req.user._id;
  const status = req.user.role === "provider" ? "pending" : "approved";
  let imageUrl = "";

  if (req.file) {
    const result = await uploadImage(req.file.buffer);
    imageUrl = result.secure_url;
  }

  const business = new Business({
    ...req.body,
    owner: ownerId,
    status,
    image: imageUrl,
  });

  await business.save();

  res.status(201).json({
    success: true,
    message: "Business created successfully",
    business,
  });
});

// ================= SEARCH Businesses (with distance + open-now) =================
export const searchBusinesses = asyncHandler(async (req, res) => {
  const {
    city,
    category,
    keyword,
    rating,
    page = 1,
    limit = 12,
    lat,
    lng,
    distance, // in meters
    openNow
  } = req.query;

  const pageNum = Number(page);
  const limitNum = Number(limit);

  // ---------------- BUILD FILTER QUERY ----------------
  const query = buildSearchQuery({
    city,
    category,
    keyword,
    rating,
    openNow,
  });

  query.status = "approved";

  // ---------------- GEO DISTANCE ----------------
  let businesses;
  let total;
  if (lat && lng && distance) {
    businesses = await Business.find({
      ...query,
      location: {
        $near: {
          $geometry: { type: "Point", coordinates: [Number(lng), Number(lat)] },
          $maxDistance: Number(distance),
        },
      },
    })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    total = await Business.countDocuments({
      ...query,
      location: {
        $near: {
          $geometry: { type: "Point", coordinates: [Number(lng), Number(lat)] },
          $maxDistance: Number(distance),
        },
      },
    });
  } else {
    businesses = await Business.find(query)
      .sort({ isFeatured: -1, featurePriority: -1, averageRating: -1, views: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    total = await Business.countDocuments(query);
  }

  res.status(200).json({
    success: true,
    businesses,
    total,
    page: pageNum,
    pages: Math.ceil(total / limitNum),
  });
});

// ================= GET BUSINESSES (used by routes) =================
export const getBusinesses = asyncHandler(async (req, res) => {
  // Simply call searchBusinesses logic with query parameters
  const {
    city,
    category,
    keyword, // alias for 'search' in old routes
    rating,
    page = 1,
    limit = 12,
    lat,
    lng,
    distance,
    openNow,
  } = req.query;

  // Reuse the same logic as searchBusinesses
  const pageNum = Number(page);
  const limitNum = Number(limit);

  const query = buildSearchQuery({
    city,
    category,
    keyword,
    rating,
    openNow,
  });

  query.status = "approved";

  let businesses;
  let total;
  if (lat && lng && distance) {
    businesses = await Business.find({
      ...query,
      location: {
        $near: {
          $geometry: { type: "Point", coordinates: [Number(lng), Number(lat)] },
          $maxDistance: Number(distance),
        },
      },
    })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    total = await Business.countDocuments({
      ...query,
      location: {
        $near: {
          $geometry: { type: "Point", coordinates: [Number(lng), Number(lat)] },
          $maxDistance: Number(distance),
        },
      },
    });
  } else {
    businesses = await Business.find(query)
      .sort({ isFeatured: -1, featurePriority: -1, averageRating: -1, views: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    total = await Business.countDocuments(query);
  }

  res.status(200).json({
    success: true,
    businesses,
    total,
    page: pageNum,
    pages: Math.ceil(total / limitNum),
  });
});

// ================= GET Single Business =================
export const getBusinessById = asyncHandler(async (req, res) => {
  const business = await Business.findById(req.params.id);
  if (!business)
    return res.status(404).json({ success: false, message: "Business not found" });

  res.status(200).json({ success: true, business });
});

// ================= UPDATE Business =================
export const updateBusiness = asyncHandler(async (req, res) => {
  const business = await Business.findById(req.params.id);
  if (!business)
    return res.status(404).json({ success: false, message: "Business not found" });

  if (!business.owner.equals(req.user._id) && !isAdmin(req.user)) {
    return res.status(403).json({ success: false, message: "Not authorized" });
  }

  Object.assign(business, req.body);
  await business.save();

  res.status(200).json({ success: true, message: "Business updated successfully", business });
});

// ================= DELETE Business =================
export const deleteBusiness = asyncHandler(async (req, res) => {
  const business = await Business.findById(req.params.id);
  if (!business)
    return res.status(404).json({ success: false, message: "Business not found" });

  if (!business.owner.equals(req.user._id) && !isAdmin(req.user)) {
    return res.status(403).json({ success: false, message: "Not authorized" });
  }

  await business.deleteOne();
  res.status(200).json({ success: true, message: "Business deleted successfully" });
});

// ================= SEARCH SUGGESTIONS =================
export const suggestSearch = asyncHandler(async (req, res) => {
  const { q } = req.query;
  if (!q) return res.json({ suggestions: [] });

  const businesses = await Business.find({ name: new RegExp(q, "i") })
    .select("name city")
    .limit(8);

  res.json({ suggestions: businesses });
});

// ================= Featured / Top / Trending Businesses =================
export const getFeaturedBusinesses = asyncHandler(async (req, res) => {
  const limit = Number(req.query.limit) || 8;
  const businesses = await Business.find({ status: "approved", isFeatured: true })
    .sort({ averageRating: -1 })
    .limit(limit);

  res.status(200).json({ success: true, businesses });
});

export const getTopRatedBusinesses = asyncHandler(async (req, res) => {
  const { city } = req.query;
  let query = { status: "approved" };
  if (city) query.city = new RegExp(city, "i");

  const businesses = await Business.find(query)
    .sort({ averageRating: -1 })
    .limit(8);

  res.json(businesses);
});

export const getTrendingBusinesses = asyncHandler(async (req, res) => {
  const businesses = await Business.find({ status: "approved" })
    .sort({ views: -1, averageRating: -1 })
    .limit(10);

  res.status(200).json({ success: true, businesses });
});

// ================= Nearby Businesses =================
export const getNearbyBusinesses = asyncHandler(async (req, res) => {
  const { lat, lng, limit = 8, distance = 5000 } = req.query;

  if (!lat || !lng) {
    return res.status(400).json({
      success: false,
      message: "Latitude and longitude required",
    });
  }

  const businesses = await Business.find({
    status: "approved",
    location: {
      $near: {
        $geometry: { type: "Point", coordinates: [Number(lng), Number(lat)] },
        $maxDistance: Number(distance),
      },
    },
  }).limit(Number(limit));

  res.status(200).json({ success: true, businesses });
});

// ================= Similar Businesses =================
export const getSimilarBusinesses = asyncHandler(async (req, res) => {
  const { category } = req.query;
  if (!category) return res.json([]);

  const businesses = await Business.find({ category, status: "approved" })
    .sort({ averageRating: -1 })
    .limit(6);

  res.json(businesses);
});

// ================= GET BUSINESS BY SLUG =================
export const getBusinessBySlug = asyncHandler(async (req, res) => {
  const { slug, city, category } = req.params;

  const business = await Business.findOne({ slug, status: "approved" }).populate("owner", "name email");

  if (!business) {
    return res.status(404).json({ success: false, message: "Business not found" });
  }

  // Optional SEO redirect
  if (city && category) {
    const correctCity = business.city?.toLowerCase();
    const correctCategory = business.category?.toLowerCase();

    if (city !== correctCity || category !== correctCategory) {
      return res.redirect(
        301,
        `https://servdial.com/${correctCity}/${correctCategory}/${business.slug}`
      );
    }
  }

  business.views = (business.views || 0) + 1;
  await business.save();

  res.status(200).json({ success: true, business });
});

// ================= LATEST BUSINESSES =================
export const getLatestBusinesses = asyncHandler(async (req, res) => {
  const { limit = 8 } = req.query;

  const businesses = await Business.find({ status: "approved" })
    .sort({ createdAt: -1 })
    .limit(Number(limit));

  res.status(200).json({ success: true, businesses });
});

// ================= Increment Views / Phone / WhatsApp =================
export const incrementViews = asyncHandler(async (req, res) => {
  const business = await Business.findByIdAndUpdate(
    req.params.id,
    { $inc: { views: 1 } },
    { new: true }
  );
  res.json(business);
});

export const phoneClick = asyncHandler(async (req, res) => {
  const business = await Business.findByIdAndUpdate(
    req.params.id,
    { $inc: { phoneClicks: 1 } },
    { new: true }
  );
  res.json(business);
});

export const whatsappClick = asyncHandler(async (req, res) => {
  const business = await Business.findByIdAndUpdate(
    req.params.id,
    { $inc: { whatsappClicks: 1 } },
    { new: true }
  );
  res.json(business);
});

// ================= Paid Feature Placeholder =================
export const paidFeatureNotice = asyncHandler(async (req, res) => {
  res.status(403).json({
    success: false,
    message: "This feature will be available soon",
  });
});