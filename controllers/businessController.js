// backend/controllers/businessController.js
import mongoose from "mongoose";
import Business from "../models/Business.js";
import BusinessView from "../models/BusinessView.js";
import Category from "../models/Category.js";
import asyncHandler from "express-async-handler";
import { buildSearchQuery } from "../utils/buildSearchQuery.js";
import UserPreference from "../models/UserPreference.js";
import BusinessClick from "../models/BusinessClick.js";
import { unifiedRanking } from "../services/ranking/unifiedRankingEngine.js";

// ================= Role Check =================
const isAdmin = (user) => ["admin", "superadmin"].includes(user.role);

// ================= NORMALIZE CATEGORY =================
const normalizeCategories = (body) => ({
  categoryId: body.categoryId || body.category || null,
  secondaryCategories: Array.isArray(body.secondaryCategories)
    ? body.secondaryCategories
    : [],
});

// ================= AUTO SET PARENT CATEGORY =================
const getParentCategory = async (categoryId) => {
  if (!categoryId) return null;
  const cat = await Category.findById(categoryId).select("parentCategory");
  return cat?.parentCategory || null;
};

// ================= CREATE =================
export const createBusiness = asyncHandler(async (req, res) => {
  if (!["provider", "admin", "superadmin"].includes(req.user.role)) {
    return res.status(403).json({ success: false, message: "Not authorized" });
  }

  const { categoryId, secondaryCategories } = normalizeCategories(req.body);

  if (!req.body.name || !categoryId || !req.body.city || !req.body.phone) {
    return res.status(400).json({ success: false, message: "Missing fields" });
  }

  const parentCategoryId = await getParentCategory(categoryId);

  const business = await Business.create({
    ...req.body,
    categoryId,
    parentCategoryId,
    secondaryCategories,
    owner: req.user._id,
    status: req.user.role === "provider" ? "pending" : "approved",
  });

  res.status(201).json({ success: true, business });
});

// ================= SEARCH =================
export const searchBusinesses = asyncHandler(async (req, res) => {
  const { city, category, keyword, page = 1, limit = 12 } = req.query;

  const query = buildSearchQuery({ city, keyword });
  query.status = "approved";

  if (category) {
    query.$or = [
      { categoryId: category },
      { secondaryCategories: category },
      { parentCategoryId: category },
    ];
  }

  const businesses = await Business.find(query)
    .sort({ isFeatured: -1, averageRating: -1, views: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));

  const total = await Business.countDocuments(query);

  res.json({ success: true, businesses, total });
});

// ================= GET BY ID =================
export const getBusinessById = asyncHandler(async (req, res) => {
  const business = await Business.findById(req.params.id)
    .populate("categoryId", "name")
    .lean();

  if (!business) {
    return res.status(404).json({ success: false });
  }

  res.json({ success: true, business });
});

// ================= GET BY SLUG =================
export const getBusinessBySlug = asyncHandler(async (req, res) => {
  const business = await Business.findOne({ slug: req.params.slug })
    .populate("categoryId", "name")
    .lean();

  if (!business) {
    return res.status(404).json({ success: false });
  }

  res.json({ success: true, business });
});

// ================= FEATURED =================
export const getFeaturedBusinesses = asyncHandler(async (req, res) => {
  const businesses = await Business.find({
    isFeatured: true,
    status: "approved",
  }).limit(10);

  res.json({ success: true, businesses });
});

// ================= TOP RATED =================
export const getTopRatedBusinesses = asyncHandler(async (req, res) => {
  const businesses = await Business.find({ status: "approved" })
    .sort({ averageRating: -1 })
    .limit(10);

  res.json({ success: true, businesses });
});

// ================= LATEST =================
export const getLatestBusinesses = asyncHandler(async (req, res) => {
  const businesses = await Business.find({ status: "approved" })
    .sort({ createdAt: -1 })
    .limit(10);

  res.json({ success: true, businesses });
});

// ================= RECOMMENDED =================
export const getRecommendedBusinesses = asyncHandler(async (req, res) => {
  const data = await unifiedRanking(req.query);
  res.json(data);
});

// ================= NEARBY =================
export const getNearbyBusinesses = asyncHandler(async (req, res) => {
  const { lat, lng } = req.query;

  const businesses = await Business.aggregate([
    {
      $geoNear: {
        near: { type: "Point", coordinates: [Number(lng), Number(lat)] },
        distanceField: "distance",
        spherical: true,
      },
    },
  ]);

  res.json({ success: true, businesses });
});

// ================= SIMILAR =================
export const getSimilarBusinesses = asyncHandler(async (req, res) => {
  const base = await Business.findById(req.params.id);

  if (!base) {
    return res.status(404).json({ success: false });
  }

  const businesses = await Business.find({
    status: "approved",
    _id: { $ne: base._id },
    $or: [
      { categoryId: base.categoryId },
      { parentCategoryId: base.parentCategoryId }
    ]
  })
    .sort({ isFeatured: -1, averageRating: -1, views: -1 })
    .limit(10);

  res.json({ success: true, businesses });
});

// ================= TRACK CLICK =================
export const trackBusinessClick = asyncHandler(async (req, res) => {
  const { keyword, city } = req.body;

  await BusinessClick.create({
    business: req.params.id,
    user: req.user?._id || null,
    keyword: keyword || null,
    city: city || null,
  });

  res.json({ success: true });
});

// ================= ANALYTICS =================
export const incrementViews = asyncHandler(async (req, res) => {
  await Business.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } });
  res.json({ success: true });
});

export const phoneClick = asyncHandler(async (req, res) => {
  await Business.findByIdAndUpdate(req.params.id, { $inc: { phoneClicks: 1 } });
  res.json({ success: true });
});

export const whatsappClick = asyncHandler(async (req, res) => {
  await Business.findByIdAndUpdate(req.params.id, { $inc: { whatsappClicks: 1 } });
  res.json({ success: true });
});

// ================= UPDATE =================
export const updateBusiness = asyncHandler(async (req, res) => {
  const business = await Business.findById(req.params.id);

  if (!business) return res.status(404).json({ success: false });

  if (!isAdmin(req.user) && !business.owner.equals(req.user._id)) {
    return res.status(403).json({ success: false });
  }

  Object.assign(business, req.body);
  await business.save();

  res.json({ success: true, business });
});

// ================= DELETE =================
export const deleteBusiness = asyncHandler(async (req, res) => {
  const business = await Business.findById(req.params.id);

  if (!business) return res.status(404).json({ success: false });

  await business.deleteOne();

  res.json({ success: true });
});

// ================= CATEGORY COUNT =================
export const getCategoryCount = asyncHandler(async (req, res) => {
  const { category, city } = req.query;

  if (!category || !city) {
    return res.json({ success: true, count: 0 });
  }

  const count = await Business.countDocuments({
    status: "approved",
    city,
    $or: [
      { category: category },
      { categoryId: category },
      { parentCategoryId: category }
    ]
  });

  res.json({ success: true, count });
});

// ================= SUGGEST =================
export const suggestSearch = asyncHandler(async (req, res) => {
  const data = await Business.find({
    name: new RegExp(req.query.q, "i"),
    status: "approved",
  })
    .select("_id name slug")
    .limit(5)
    .lean();

  res.json({
    success: true,
    suggestions: data,
  });
});

// ================= PAID =================
export const paidFeatureNotice = asyncHandler(async (req, res) => {
  res.status(403).json({ success: false, message: "Coming soon" });
});