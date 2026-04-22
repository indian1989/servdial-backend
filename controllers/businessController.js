// backend/controllers/businessController.js
import mongoose from "mongoose";
import Business from "../models/Business.js";
import BusinessView from "../models/BusinessView.js";
import Category from "../models/Category.js";
import asyncHandler from "express-async-handler";
import { buildSearchQuery } from "../utils/buildSearchQuery.js";
import UserPreference from "../models/UserPreference.js";
import BusinessClick from "../models/BusinessClick.js";
import { resolveCategoryBySlug, getLeafCategoryIds } from "./categoryController.js";
import { resolveCity } from "../services/cityResolver.js";
import { rankBusinesses } from "../utils/rankBusinesses.js";

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
    state: isPrivileged ? body.state || null : null,
    district: isPrivileged ? body.district || null : null,
    location:
       body.location &&
       body.location.type === "Point" &&
       Array.isArray(body.location.coordinates)
       ? body.location
       : undefined,
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

// 🔥 ENSURE VALID OBJECTID FORMAT
if (base.cityId && !mongoose.Types.ObjectId.isValid(base.cityId)) {
  base.cityId = null;
}

if (typeof base.cityId === "string" && base.cityId.trim() === "") {
  base.cityId = null;
}

  if (isPrivileged) {
    base.parentCategoryId = body.parentCategoryId || null;
    base.status = "approved";
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

    // 🔥 DUPLICATE CHECK (name + city)
const existing = await Business.findOne({
  name: { $regex: `^${sanitized.name}$`, $options: "i" },
  cityId: sanitized.cityId,
});

if (existing) {
  return res.status(400).json({
    success: false,
    message: "Business already exists in this city",
  });
}

// 🔥 GENERATE SLUG
const slugBase = sanitized.name
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/(^-|-$)/g, "");

const slug = `${slugBase}-${Date.now().toString().slice(-4)}`;

  const business = await Business.create({
    ...sanitized,
    slug,
    parentCategoryId,
    owner: req.user._id,
    isClaimed: isProvider,
    intentTags: normalizedIntentTags,
  });

  return res.status(201).json({
    success: true,
    data: business,
  });
});

// ================= UPDATE BUSINESS =================
export const updateBusiness = asyncHandler(async (req, res) => {
  const business = await Business.findById(req.params.id)
  .setOptions({ includeAll: true });
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

  res.json({ success: true, data: business, });
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

  const business = await Business.findById(businessId)
  .setOptions({ includeAll: true });
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
    data: businesses,
  });
});

// ================= SEARCH =================
export const searchBusinesses = asyncHandler(async (req, res) => {
  const { citySlug, categorySlug, page = 1, limit = 12 } = req.query;

  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit)));

  /* =========================================================
     🔥 STEP 1: RESOLVE CITY
     ========================================================= */
  const city = await resolveCity({ citySlug });

  if (!city) {
    return res.status(404).json({
      success: false,
      message: "City not found",
    });
  }

  /* =========================================================
     🔥 STEP 2: RESOLVE CATEGORY
     ========================================================= */
  const category = await resolveCategoryBySlug(categorySlug);

  if (!category) {
    return res.status(404).json({
      success: false,
      message: "Category not found",
    });
  }

  /* =========================================================
     🔥 STEP 3: EXPAND TO LEAF IDS
     ========================================================= */
  const leafCategoryIds = await getLeafCategoryIds(category._id);

  /* =========================================================
     🔥 STEP 4: DB QUERY (ID ONLY — GOLDEN RULE)
     ========================================================= */
  const businesses = await Business.find({
    cityId: city._id,
    categoryId: { $in: leafCategoryIds },
    status: "approved",
  })
    .select("name slug rating averageRating totalReviews reviewCount views isFeatured")
    .lean();

    /* =========================================================
     🔥 STEP 5: RANKING
     ========================================================= */
    const ranked = await rankBusinesses(
  businesses,
  null, // userLocation (add later)
  "",   // searchQuery (add later)
  {},   // intent (add later)
  req.user?._id || null,
  city._id
);

  /* =========================================================
     🔥 STEP 6: PAGINATION
     ========================================================= */
  const start = (pageNum - 1) * limitNum;
  const paginated = ranked.slice(start, start + limitNum);

  /* =========================================================
     🔥 STEP 7: RESPONSE (STANDARDIZED)
     ========================================================= */
  res.json({
    success: true,
    data: paginated,
    meta: {
      total: ranked.length,
      page: pageNum,
      pages: Math.ceil(ranked.length / limitNum),
      city: {
        name: city.name,
        slug: city.slug,
      },
      category: {
        name: category.name,
        slug: category.slug,
      },
    },
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

  res.json({ success: true, data: businesses, });
});

export const getBusinesses = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;

  const query = {
    status: "approved",
    isDeleted: false,
  };

  const businesses = await Business.find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit))
    .lean();

  const total = await Business.countDocuments(query);

  res.json({
    success: true,
    data: businesses,
    meta: {
      total,
      page: Number(page),
      limit: Number(limit),
    },
  });
});

// ================= GET BY SLUG =================
export const getBusinessBySlug = asyncHandler(async (req, res) => {
  const business = await Business.findOne({ slug: req.params.slug })
    .populate("categoryId", "name")
    .lean();

  if (!business) {
    return res.status(404).json({ success: false });
  }

  res.json({ success: true, data: businesses, });
});

// ================= FEATURED =================
export const getFeaturedBusinesses = asyncHandler(async (req, res) => {
  const businesses = await Business.find({
    isFeatured: true,
    status: "approved",
  })
    .sort({ featurePriority: -1, createdAt: -1 })
    .limit(10)
    .lean();

  res.json({
    success: true,
    data: businesses,
  });
});

// ================= TOP RATED =================
export const getTopRatedBusinesses = asyncHandler(async (req, res) => {
  const businesses = await Business.find({ status: "approved" })
    .sort({ averageRating: -1, totalReviews: -1 })
    .limit(10)
    .lean();

  res.json({
    success: true,
    data: businesses,
  });
});

// ================= LATEST =================
export const getLatestBusinesses = asyncHandler(async (req, res) => {
  const businesses = await Business.find({ status: "approved" })
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  res.json({
    success: true,
    data: businesses,
  });
});

// ================= RECOMMENDED =================
export const getRecommendedBusinesses = asyncHandler(async (req, res) => {
  let businesses = await Business.find({
    status: "approved"
  })
    .limit(50)
    .lean();

  const ranked = await rankBusinesses(
    businesses,
    null,
    "",
    { recommendation: true },
    req.user?._id || null,
    null
  );

  res.json({
    success: true,
    data: ranked,
  });
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

  res.json({
  success: true,
  data: businesses
});
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

  res.json({
  success: true,
  data: businesses
});
});

// ================== GET PROVIDER BUSINESSES ==============
export const getProviderBusinesses = async (req, res) => {
  try {
    const businesses = await Business.find({
      owner: req.user._id
    })
      .setOptions({ includeAll: true })
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

  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0] ||
    req.socket.remoteAddress ||
    null;

  const userAgent = req.headers["user-agent"] || null;

  const fingerprint = `${ip}-${userAgent}`;

  // 🔥 PREVENT SPAM (1 click per 10 minutes)
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

  const existingClick = await BusinessClick.findOne({
    business: req.params.id,
    $or: [
      { user: req.user?._id || null },
      { fingerprint }
    ],
    createdAt: { $gte: tenMinutesAgo }
  });

  if (existingClick) {
    return res.json({ success: true, deduplicated: true });
  }

  await BusinessClick.create({
    business: req.params.id,
    user: req.user?._id || null,
    keyword: keyword || null,
    cityId: city || null,
    ipAddress: ip,
    userAgent,
    fingerprint
  });

  res.json({ success: true });
});

// ================= ANALYTICS WITH USER PREFERENCE =================
export const incrementViews = asyncHandler(async (req, res) => {
  const businessId = req.params.id;
  const userId = req.user?._id || null;

  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0] ||
    req.socket.remoteAddress ||
    null;

  const userAgent = req.headers["user-agent"] || null;

  const fingerprint = `${ip}-${userAgent}`;

  // 🔥 PREVENT SPAM (1 view per 15 minutes)
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

  const existingView = await BusinessView.findOne({
    business: businessId,
    $or: [
      { user: userId },
      { fingerprint }
    ],
    createdAt: { $gte: fifteenMinutesAgo }
  });

  if (existingView) {
    return res.json({ success: true, deduplicated: true });
  }

  // ✅ VALID VIEW → STORE
  await BusinessView.create({
    business: businessId,
    user: userId,
    ipAddress: ip,
    userAgent,
    fingerprint
  });

  // ✅ SAFE INCREMENT
  await Business.findByIdAndUpdate(businessId, {
    $inc: {
      views: 1,
      trendingScore: 0.01
    }
  });

  // ✅ USER PREFERENCE UPDATE (UNCHANGED)
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
  const business = await Business.findById(req.params.id)
  .setOptions({ includeAll: true });

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
  const business = await Business.findById(req.params.id)
  .setOptions({ includeAll: true });
  if (!business) { res.status(404); throw new Error("Business not found"); }

  business.businessHours = req.body.businessHours;
  await business.save();

  res.json({ success: true, message: "Business hours updated", businessHours: business.businessHours });
});

// ================================
// MANAGE BUSINESS MEDIA
// ================================
export const updateBusinessMedia = asyncHandler(async (req, res) => {
  const business = await Business.findById(req.params.id)
  .setOptions({ includeAll: true });
  if (!business) { res.status(404); throw new Error("Business not found"); }

  business.images = req.body.images || business.images;
  await business.save();

  res.json({ success: true, message: "Business media updated", images: business.images });
});