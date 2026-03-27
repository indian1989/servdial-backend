import Business from "../models/Business.js";
import Category from "../models/Category.js";
import asyncHandler from "express-async-handler";
import { uploadImage } from "../utils/uploadToCloudinary.js";
import { buildSearchQuery } from "../utils/buildSearchQuery.js";

// ================= Role Check =================
const isAdmin = (user) => ["admin", "superadmin"].includes(user.role);

// ================= NORMALIZE CATEGORY =================
const normalizeCategories = (body) => {
  return {
    categoryId: body.categoryId || body.category || null, // ✅ FIXED
    secondaryCategories: Array.isArray(body.secondaryCategories)
      ? body.secondaryCategories
      : [],
  };
};

// ================= AUTO SET PARENT CATEGORY =================
const getParentCategory = async (categoryId) => {
  if (!categoryId) return null;

  const cat = await Category.findById(categoryId).select("parentCategory");
  return cat?.parentCategory || null;
};

// ================= CREATE =================
export const createBusiness = asyncHandler(async (req, res) => {
  if (!["provider", "admin", "superadmin"].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: "Not authorized",
    });
  }

  const { categoryId, secondaryCategories } = normalizeCategories(req.body);

  // ✅ BASIC VALIDATION
  if (!req.body.name || !categoryId || !req.body.city || !req.body.phone) {
    return res.status(400).json({
      success: false,
      message: "Missing required fields",
    });
  }

  // ✅ AUTO PARENT CATEGORY
  const parentCategoryId = await getParentCategory(categoryId);

  try {
    const business = await Business.create({
      ...req.body,

      categoryId,
      parentCategoryId,
      secondaryCategories,

      owner: req.user._id,

      // ✅ PROVIDER = pending
      status: req.user.role === "provider" ? "pending" : "approved",

      // ✅ FIXED FIELDS
      logo: req.body.logo || "",
      images: req.body.images || [],
    });

    res.status(201).json({
      success: true,
      business,
    });

  } catch (err) {
    // ✅ HANDLE DUPLICATE PHONE
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Phone already exists",
      });
    }

    throw err;
  }
});

// ================= SEARCH =================
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
    distance,
    openNow,
  } = req.query;

  const pageNum = Number(page);
  const limitNum = Number(limit);

  const query = buildSearchQuery({
    city,
    keyword,
    rating,
    openNow,
  });

  query.status = "approved";

  // ✅ CATEGORY FIX (PRIMARY + SECONDARY + PARENT)
  if (category) {
    query.$or = [
      { categoryId: category },
      { secondaryCategories: category },
      { parentCategoryId: category }, // 🔥 IMPORTANT
    ];
  }

  let businesses = [];
  let total = 0;

  // ================= GEO SEARCH =================
  if (lat && lng && distance) {
    businesses = await Business.aggregate([
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [Number(lng), Number(lat)],
          },
          distanceField: "distance",
          maxDistance: Number(distance),
          spherical: true,
        },
      },
      { $match: query },
      { $sort: { isFeatured: -1, averageRating: -1 } },
      { $skip: (pageNum - 1) * limitNum },
      { $limit: limitNum },
    ]);

    total = businesses.length;

    businesses = businesses.map((b) => ({
      ...b,
      rating: b.averageRating || 0,
      reviewCount: b.totalReviews || 0,
      distance: b.distance ? b.distance / 1000 : null,
    }));
  } else {
    const raw = await Business.find(query)
      .sort({
        isFeatured: -1,
        featurePriority: -1,
        averageRating: -1,
        views: -1,
      })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    total = await Business.countDocuments(query);

    businesses = raw.map((b) => ({
      ...b.toObject(),
      rating: b.averageRating || 0,
      reviewCount: b.totalReviews || 0,
      distance: null,
    }));
  }

  res.json({
    success: true,
    businesses,
    total,
    page: pageNum,
    pages: Math.ceil(total / limitNum),
  });
});

// ================= GET ALL =================
export const getBusinesses = asyncHandler(async (req, res) => {
  const businesses = await Business.find({ status: "approved" })
    .sort({ createdAt: -1 })
    .limit(50)
    .populate("categoryId parentCategoryId");

  res.json({
    success: true,
    businesses,
  });
});

// ================= GET BY ID =================
export const getBusinessById = asyncHandler(async (req, res) => {
  const business = await Business.findById(req.params.id)
    .populate("categoryId parentCategoryId");

  if (!business) {
    return res.status(404).json({
      success: false,
      message: "Not found",
    });
  }

  res.json({
    success: true,
    business,
  });
});

// ================= UPDATE =================
export const updateBusiness = asyncHandler(async (req, res) => {
  const business = await Business.findById(req.params.id);

  if (!business) {
    return res.status(404).json({
      success: false,
      message: "Not found",
    });
  }

  if (!business.owner.equals(req.user._id) && !isAdmin(req.user)) {
    return res.status(403).json({
      success: false,
      message: "Not authorized",
    });
  }

  const { categoryId, secondaryCategories } = normalizeCategories(req.body);

  let parentCategoryId = business.parentCategoryId;

  if (categoryId) {
    parentCategoryId = await getParentCategory(categoryId);
  }

  Object.assign(business, {
    ...req.body,
    categoryId,
    parentCategoryId,
    secondaryCategories,
  });

  await business.save();

  res.json({
    success: true,
    business,
  });
});

// ================= DELETE =================
export const deleteBusiness = asyncHandler(async (req, res) => {
  const business = await Business.findById(req.params.id);

  if (!business) {
    return res.status(404).json({
      success: false,
      message: "Not found",
    });
  }

  await business.deleteOne();

  res.json({ success: true });
});

// ================= SUGGEST =================
export const suggestSearch = asyncHandler(async (req, res) => {
  const { q } = req.query;

  if (!q) return res.json([]);

  const businesses = await Business.find({
    $or: [
      { name: new RegExp(q, "i") },
    ],
  })
    .limit(8)
    .select("name categoryId city");

  res.json(businesses);
});

// ================= FEATURED =================
export const getFeaturedBusinesses = asyncHandler(async (req, res) => {
  const businesses = await Business.find({
    status: "approved",
    isFeatured: true,
  }).limit(8);

  res.json({ success: true, businesses });
});

// ================= TOP RATED =================
export const getTopRatedBusinesses = asyncHandler(async (req, res) => {
  const businesses = await Business.find({ status: "approved" })
    .sort({ averageRating: -1 })
    .limit(8);

  res.json({ success: true, businesses });
});

// ================= LATEST =================
export const getLatestBusinesses = asyncHandler(async (req, res) => {
  const businesses = await Business.find({ status: "approved" })
    .sort({ createdAt: -1 })
    .limit(8);

  res.json({ success: true, businesses });
});

// ================= NEARBY =================
export const getNearbyBusinesses = asyncHandler(async (req, res) => {
  const { lat, lng } = req.query;

  if (!lat || !lng) return res.json([]);

  const businesses = await Business.find({
    location: {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: [Number(lng), Number(lat)],
        },
        $maxDistance: 5000,
      },
    },
  }).limit(8);

  res.json({ success: true, businesses });
});

// ================= SIMILAR =================
export const getSimilarBusinesses = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const current = await Business.findById(id);
  if (!current) return res.json([]);

  const businesses = await Business.find({
    $or: [
      { categoryId: current.categoryId },
      { secondaryCategories: current.categoryId },
      { parentCategoryId: current.parentCategoryId },
    ],
    _id: { $ne: id },
  }).limit(6);

  res.json({ success: true, businesses });
});

// ================= SLUG =================
export const getBusinessBySlug = asyncHandler(async (req, res) => {
  const { slug } = req.params;

  const business = await Business.findOne({ slug });

  if (!business) {
    return res.status(404).json({ success: false });
  }

  res.json({ success: true, business });
});

// ================= ANALYTICS =================
export const incrementViews = asyncHandler(async (req, res) => {
  await Business.findByIdAndUpdate(req.params.id, {
    $inc: { views: 1 },
  });

  res.json({ success: true });
});

export const phoneClick = asyncHandler(async (req, res) => {
  await Business.findByIdAndUpdate(req.params.id, {
    $inc: { phoneClicks: 1 },
  });

  res.json({ success: true });
});

export const whatsappClick = asyncHandler(async (req, res) => {
  await Business.findByIdAndUpdate(req.params.id, {
    $inc: { whatsappClicks: 1 },
  });

  res.json({ success: true });
});

// ================= PAID =================
export const paidFeatureNotice = asyncHandler(async (req, res) => {
  res.status(403).json({
    success: false,
    message: "This feature will be available soon",
  });
});