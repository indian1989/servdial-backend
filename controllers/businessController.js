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
import { computeFinalScore } from "../services/search/fusionScore.js";

// ================= Role Check =================
const isAdmin = (user) => ["admin", "superadmin"].includes(user.role);

// ================= AUTO SET PARENT CATEGORY =================
const getParentCategory = async (categoryId) => {
  if (!categoryId) return null;
  const cat = await Category.findById(categoryId).select("parentCategory");
  return cat?.parentCategory || null;
};

// ================= SANITIZE INPUT =================
const sanitizeBusinessInput = (body, user) => {
  const isPrivileged = isAdmin(user);

  const base = {
    name: body.name,
    description: body.description,
    address: body.address,
    phone: body.phone,
    whatsapp: body.whatsapp,
    website: body.website,
    pincode: body.pincode ? String(body.pincode).trim() : undefined,
    cityId: body.cityId || body.city || null,
    state: body.state || null,
    district: body.district || null,
    logo: body.logo || "",
    images: Array.isArray(body.images) ? body.images : [],
    services: Array.isArray(body.services) ? body.services : [],
    tags: Array.isArray(body.tags)
  ? [...new Set(
      body.tags
        .filter(Boolean)
        .map(tag => String(tag).toLowerCase().trim())
    )]
  : [],
    categoryId: body.categoryId || body.category || null,
  };

  if (base.cityId && typeof base.cityId === "object") {
  base.cityId = base.cityId._id || base.cityId.value || null;
}

if (typeof base.cityId === "string" && base.cityId.trim() === "") {
  base.cityId = null;
}

  if (isPrivileged) {
    base.parentCategoryId = body.parentCategoryId || null;
    base.status = body.status || "approved";
    base.isFeatured = body.isFeatured || false;
    base.featurePriority = body.featurePriority || 0;
  } else {
    base.status = "pending";
  }
  return base;
};


// ================= ADD BUSINESS =================
export const createBusiness = asyncHandler(async (req, res) => {
  const allowedRoles = ["provider", "admin", "superadmin"];

  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: "Not authorized",
    });
  }
  const sanitized = sanitizeBusinessInput(req.body, req.user);
  const missingFields = [];

  const isEmpty = (v) =>
    v === undefined ||
    v === null ||
    v === "" ||
    (typeof v === "object" && !Object.keys(v).length);

  if (isEmpty(sanitized.name)) missingFields.push("name");
  if (isEmpty(sanitized.categoryId)) missingFields.push("categoryId");
  if (isEmpty(sanitized.cityId)) missingFields.push("cityId");
  if (isEmpty(sanitized.phone)) missingFields.push("phone");

  if (missingFields.length) {
    return res.status(400).json({
      success: false,
      message: "Required fields missing",
      missingFields,
    });
  }
  let parentCategoryId = null;

  if (sanitized.categoryId) {
    parentCategoryId = await getParentCategory(sanitized.categoryId);
  }

  const isProvider = req.user.role === "provider";
  const normalizedIntentTags = Array.isArray(req.body.intentTags)
    ? [...new Set(
        req.body.intentTags
          .filter(Boolean)
          .map((tag) => tag.toLowerCase().trim())
      )]
    : [];
  const business = await Business.create({
    ...sanitized,

    parentCategoryId,
    owner: req.user._id,
    isClaimed: isProvider,

    intentTags: normalizedIntentTags,
  });

  return res.status(201).json({
    success: true,
    business,
  });
});

// ================= UPDATE BUSINESS =================
export const updateBusiness = asyncHandler(async (req, res) => {
  const business = await Business.findById(req.params.id);
  if (!business) return res.status(404).json({ success: false, message: "Business not found" });
  const isOwner =
  business.owner &&
  req.user?._id &&
  business.owner.equals(req.user._id);
  const isPrivileged = isAdmin(req.user);

  if (!isPrivileged && !isOwner) return res.status(403).json({ success: false, message: "Not authorized" });

  const sanitized = sanitizeBusinessInput(req.body, req.user);

  // remove empty/undefined fields
  Object.keys(sanitized).forEach((key) => {
    if (sanitized[key] === undefined || sanitized[key] === "") delete sanitized[key];
  });

  // Providers cannot override system fields
  if (!isPrivileged) {
    delete sanitized.categoryId;
    delete sanitized.cityId;
    delete sanitized.state;
    delete sanitized.district;
    delete sanitized.isFeatured;
    delete sanitized._id;
    delete sanitized.owner;
    delete sanitized.createdAt;
    delete sanitized.updatedAt;

    // Provider updates → status = pending automatically
    sanitized.status = "pending";
  }

  // Admin/Superadmin updating → claimed businesses remain approved
  if (isPrivileged && business.isClaimed) {
    sanitized.status = business.status === "approved" ? "approved" : business.status;
  }

  business.set(sanitized);

// ✅ INTENT TAGS UPDATE
if (req.body.intentTags !== undefined) {
  business.intentTags = Array.isArray(req.body.intentTags)
    ? [...new Set(
        req.body.intentTags
          .filter(Boolean)
          .map(tag => String(tag).toLowerCase().trim())
      )]
    : [];
}
  await business.save();

  res.json({ success: true, business });
});

// ================================
// CLAIM BUSINESS (Provider claims admin/superadmin created business)
// ================================
export const claimBusiness = asyncHandler(async (req, res) => {
  const providerId = req.user._id;

  const { businessId } = req.body;
  if (!businessId) {
    res.status(400);
    throw new Error("Business ID is required");
  }

  const business = await Business.findById(businessId);
  if (!business) {
    res.status(404);
    throw new Error("Business not found");
  }

  if (business.isClaimed) {
    res.status(400);
    throw new Error("Business is already claimed");
  }

  // Transfer ownership to provider
  business.owner = providerId;
  business.isClaimed = true;
  business.status = "pending"; // pending re-approval
  await business.save();

  res.status(200).json({
    success: true,
    message: "Business claimed successfully, pending admin approval",
    business,
  });
});

// ================= SEARCH =================
export const searchBusinesses = asyncHandler(async (req, res) => {
  // ================= SEARCH CONTEXT =================
  const isDiscover = req.path.includes("discover");
  const isLegacySearch = req.path.includes("search") || req.path === "/";

  const {
    city,
    category,
    keyword,
    page = 1,
    limit = 12,
  } = req.query;

  // ================= QUERY BUILD =================
  const query = buildSearchQuery({ city, keyword, category });

  query.status = "approved";

  const pageNum = Math.max(1, parseInt(page) || 1);
const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 12));

  // ================= FETCH =================
  let businesses = await Business.find(query)
    .populate("categoryId", "name slug")
    .select("name slug categoryId cityId cityName averageRating views isFeatured clickScore trendingScore vectorScore")
    .lean();

  // ================= NORMALIZATION =================
  const clamp01 = (n) => Math.max(0, Math.min(1, n));

  const normalizeSignals = (b) => ({
    keywordScore: clamp01(b.keywordScore || 0),
    ratingScore: clamp01((b.averageRating || 0) / 5),
    clickScore: clamp01(b.clickScore || 0),
    distanceScore: clamp01(b.distanceScore ?? 1), 
    trendingScore: clamp01(b.trendingScore || 0),
    vectorScore: clamp01(b.vectorScore || 0)
  });

  // ================= RANKING ENGINE =================
businesses = businesses.map((b) => {
  const normalized = normalizeSignals(b);

  const finalScore = computeFinalScore({
  ...normalized,
  featureBoost: b.isFeatured ? 1 : 0
});

  return {
    id: b._id,
    name: b.name,
    slug: b.slug,
    categoryId: b.categoryId,
    cityId: b.cityId,
    cityName: b.cityName,
    averageRating: b.averageRating,
    views: b.views,
    isFeatured: b.isFeatured,
    featureBoost: b.isFeatured ? 1 : 0,

    finalScore
  };
});

// ================= SORT =================
businesses.sort((a, b) => {
  const diff = (b.finalScore || 0) - (a.finalScore || 0);
  return diff !== 0 ? diff : (b.views || 0) - (a.views || 0);
});

  // ================= PAGINATION =================
  const start = (pageNum - 1) * limitNum;
  const end = start + limitNum;

  const paginated = businesses.slice(start, end);

  // ================= TOTAL =================
  const total = businesses.length;

  res.json({
    success: true,
    businesses: paginated,
    total
  });
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
      maxDistance: 50000 // v1 safety limit (50km)
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

// ================== GET PROVIDER BUSINESSES ==============
export const getProviderBusinesses = async (req, res) => {
  try {
    const businesses = await Business.find({
      owner: req.user._id
    })
      .populate("categoryId")
      .populate("cityId");

    res.json({ businesses });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ================= TRACK CLICK =================
export const trackBusinessClick = asyncHandler(async (req, res) => {
  const { keyword, city } = req.body;

  await BusinessClick.create({
    business: req.params.id,
    user: req.user?._id || null,
    keyword: keyword || null,
    cityId: city || null,
  });

  res.json({ success: true });
});

// ================= ANALYTICS WITH USER PREFERENCE =================
export const incrementViews = asyncHandler(async (req, res) => {
  const businessId = req.params.id;
  const userId = req.user?._id || null;

  // Record in BusinessView collection
  await BusinessView.create({
    business: businessId,
    user: userId,
    viewedAt: new Date(),
  });

  // Increment total views in Business
  await Business.findByIdAndUpdate(businessId, {
  $inc: {
    views: 1,
    trendingScore: 0.01
  }
});

  // Update UserPreference if user is logged in
  if (userId) {
    const business = await Business.findById(businessId).select("categoryId parentCategoryId");
    if (business) {
      await UserPreference.findOneAndUpdate(
        { user: userId },
        { 
          $inc: { 
            [`categories.${business.categoryId}`]: 1, 
            [`parentCategories.${business.parentCategoryId}`]: 1 
          } 
        },
        { upsert: true, new: true }
      );
    }
  }

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

// ================= DELETE =================
export const deleteBusiness = asyncHandler(async (req, res) => {
  const business = await Business.findById(req.params.id);

  if (!business) {
    return res.status(404).json({ success: false });
  }

  const isOwner =
  business.owner &&
  req.user?._id &&
  business.owner.equals(req.user._id);
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
    cityId: city,
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
    name: { $regex: req.query.q || "", $options: "i" },
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

// ================================
// MANAGE BUSINESS HOURS
// ================================
export const updateBusinessHours = asyncHandler(async (req, res) => {
  const business = await Business.findById(req.params.id);
  if (!business) { res.status(404); throw new Error("Business not found"); }

  business.businessHours = req.body.businessHours;
  await business.save();

  res.json({ success: true, message: "Business hours updated", businessHours: business.businessHours });
});

// ================================
// MANAGE BUSINESS MEDIA
// ================================
export const updateBusinessMedia = asyncHandler(async (req, res) => {
  const business = await Business.findById(req.params.id);
  if (!business) { res.status(404); throw new Error("Business not found"); }

  business.images = req.body.images || business.images;
  await business.save();

  res.json({ success: true, message: "Business media updated", images: business.images });
});