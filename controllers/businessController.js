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

// ================= SANITIZE INPUT =================
const sanitizeBusinessInput = (body, user) => {
  const isPrivileged = ["admin", "superadmin"].includes(user?.role);

  const base = {
    name: body.name,
    description: body.description,
    address: body.address,
    phone: body.phone,
    whatsapp: body.whatsapp,
    website: body.website,
    pincode: body.pincode ? String(body.pincode).trim() : undefined,
    city: body.city || null,
    state: body.state || null,
    district: body.district || null,
    images: body.images,
    services: body.services,
    tags: body.tags,
  };

  const { categoryId, secondaryCategories } = normalizeCategories(body);

base.categoryId = categoryId;
base.secondaryCategories = secondaryCategories;

  // normalize city if object comes from frontend

  if (isPrivileged) {
    base.parentCategoryId = body.parentCategoryId || null;
    base.status = body.status || "approved";
    base.isFeatured = body.isFeatured || false;
    base.featurePriority = body.featurePriority || 0;
  } else {
    base.status = "pending";
  }

  if (base.city && typeof base.city === "object") {
  base.city = base.city._id || base.city.value || null;
}

if (typeof base.city === "string" && base.city.trim() === "") {
  base.city = null;
}
base.images = Array.isArray(body.images) ? body.images : [];
base.services = Array.isArray(body.services) ? body.services : [];
base.tags = Array.isArray(body.tags) ? body.tags : [];

  return base;
};

// ================= CREATE BUSINESS =================
export const createBusiness = asyncHandler(async (req, res) => {
  if (!["provider", "admin", "superadmin"].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: "Not authorized",
    });
  }

  const sanitized = sanitizeBusinessInput(req.body, req.user);

  // DEBUG (safe for dev)
  console.log("CREATE BUSINESS BODY:", req.body);
  console.log("SANITIZED:", sanitized);

  // safe empty check
  const isEmpty = (v) =>
    v === undefined ||
    v === null ||
    v === "" ||
    (typeof v === "object" && !Object.keys(v).length);

  const missingFields = [];

  if (isEmpty(sanitized.name)) missingFields.push("name");
  if (isEmpty(sanitized.categoryId)) missingFields.push("categoryId");
  if (isEmpty(sanitized.city)) missingFields.push("city");
  if (isEmpty(sanitized.phone)) missingFields.push("phone");

  if (missingFields.length) {
    return res.status(400).json({
      success: false,
      message: "Required fields missing",
      missingFields,
    });
  }

  const parentCategoryId = await getParentCategory(sanitized.categoryId);

  const business = await Business.create({
    ...sanitized,
    parentCategoryId,
    owner: req.user._id,
  });

  res.status(201).json({
    success: true,
    business,
  });
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

  if (!lat || !lng) {
    return res.status(400).json({
      success: false,
      message: "lat/lng required",
    });
  }

  const businesses = await Business.aggregate([
    {
      $geoNear: {
        near: {
          type: "Point",
          coordinates: [Number(lng), Number(lat)],
        },
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

  if (!business) {
    return res.status(404).json({ success: false });
  }

  const isOwner = business.owner.equals(req.user._id);
  const isPrivileged = isAdmin(req.user);

  if (!isPrivileged && !isOwner) {
    return res.status(403).json({ success: false });
  }

  const sanitized = sanitizeBusinessInput(req.body, req.user);

// remove empty/undefined fields
Object.keys(sanitized).forEach((key) => {
  if (sanitized[key] === undefined || sanitized[key] === "") {
    delete sanitized[key];
  }
});

  // providers cannot override system fields
  if (!isPrivileged) {
    delete sanitized.categoryId;
    delete sanitized.city;
    delete sanitized.state;
    delete sanitized.district;
    delete sanitized.status;
    delete sanitized.isFeatured;
    delete sanitized._id;
delete sanitized.owner;
delete sanitized.createdAt;
delete sanitized.updatedAt;
  }

  Object.assign(business, sanitized);

  await business.save();

  res.json({ success: true, business });
});
// ================= DELETE =================
export const deleteBusiness = asyncHandler(async (req, res) => {
  const business = await Business.findById(req.params.id);

  if (!business) {
    return res.status(404).json({ success: false });
  }

  const isOwner = business.owner.equals(req.user._id);
  const isPrivileged = isAdmin(req.user);

  if (!isPrivileged && !isOwner) {
    return res.status(403).json({ success: false });
  }

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