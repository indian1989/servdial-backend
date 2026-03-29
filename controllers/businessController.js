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
const normalizeCategories = (body) => {
  return {
    categoryId: body.categoryId || body.category || null,
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

  if (!req.body.name || !categoryId || !req.body.city || !req.body.phone) {
    return res.status(400).json({
      success: false,
      message: "Missing required fields",
    });
  }

  const parentCategoryId = await getParentCategory(categoryId);

  try {
    const business = await Business.create({
      ...req.body,
      categoryId,
      parentCategoryId,
      secondaryCategories,
      owner: req.user._id,
      status: req.user.role === "provider" ? "pending" : "approved",
      logo: req.body.logo || "",
      images: req.body.images || [],
    });

    res.status(201).json({
      success: true,
      business,
    });

  } catch (err) {
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

  if (category) {
    query.$or = [
      { categoryId: category },
      { secondaryCategories: category },
      { parentCategoryId: category },
    ];
  }

  let businesses = [];
  let total = 0;

  if (lat && lng && distance) {
    const pipeline = [
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
    ];

    const countResult = await Business.aggregate([
      ...pipeline,
      { $count: "total" },
    ]);
    total = countResult[0]?.total || 0;

    businesses = await Business.aggregate([
      ...pipeline,
      {
        $sort: {
          isFeatured: -1,
          featurePriority: -1,
          averageRating: -1,
          views: -1,
        },
      },
      { $skip: (pageNum - 1) * limitNum },
      { $limit: limitNum },
    ]);
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

// ================= GET BUSINESS BY ID =================
export const getBusinessById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid business ID",
    });
  }

  const business = await Business.findById(id)
    .populate("categoryId", "name")
    .populate("secondaryCategories", "name")
    .lean();

  if (!business) {
    return res.status(404).json({
      success: false,
      message: "Business not found",
    });
  }

  res.json({ success: true, business });
});

// ================= GET BUSINESS BY SLUG =================
export const getBusinessBySlug = asyncHandler(async (req, res) => {
  const { slug } = req.params;

  const business = await Business.findOne({ slug })
    .populate("categoryId", "name")
    .populate("secondaryCategories", "name")
    .lean();

  if (!business) {
    return res.status(404).json({
      success: false,
      message: "Business not found",
    });
  }

  res.json({ success: true, business });
});

// ================= FEATURED =================
export const getFeaturedBusinesses = asyncHandler(async (req, res) => {
  const { city, category, limit = 10 } = req.query;

  const query = {
    isFeatured: true,
    status: "approved",
  };

  if (city) query.city = new RegExp(city, "i");

  if (category) {
    query.$or = [
      { categoryId: category },
      { secondaryCategories: category },
      { parentCategoryId: category },
    ];
  }

  const businesses = await Business.find(query)
    .sort({ featurePriority: -1, averageRating: -1, views: -1 })
    .limit(Number(limit))
    .lean();

  res.json({ success: true, businesses });
});

// ================= LATEST =================
export const getLatestBusinesses = asyncHandler(async (req, res) => {
  const { city, category, limit = 10 } = req.query;

  const query = { status: "approved" };

  if (city) query.city = new RegExp(city, "i");

  if (category) {
    query.$or = [
      { categoryId: category },
      { secondaryCategories: category },
      { parentCategoryId: category },
    ];
  }

  const businesses = await Business.find(query)
    .sort({ createdAt: -1 })
    .limit(Number(limit))
    .lean();

  res.json({ success: true, businesses });
});

// ================= NEARBY =================
export const getNearbyBusinesses = asyncHandler(async (req, res) => {
  const { lat, lng, distance = 5000, limit = 10, category, city } = req.query;

  if (!lat || !lng) {
    return res.status(400).json({
      success: false,
      message: "Latitude and longitude are required",
    });
  }

  const query = { status: "approved" };

  if (city) query.city = new RegExp(city, "i");

  if (category) {
    query.$or = [
      { categoryId: category },
      { secondaryCategories: category },
      { parentCategoryId: category },
    ];
  }

  const businesses = await Business.aggregate([
    {
      $geoNear: {
        near: {
          type: "Point",
          coordinates: [Number(lng), Number(lat)],
        },
        distanceField: "distance",
        maxDistance: Number(distance),
        spherical: true,
        query,
      },
    },
    { $sort: { distance: 1, averageRating: -1, isFeatured: -1 } },
    { $limit: Number(limit) },
  ]);

  res.json({ success: true, businesses });
});

// ================= SIMILAR =================
export const getSimilarBusinesses = asyncHandler(async (req, res) => {
  const { id, limit = 10 } = req.query;

  const baseBusiness = await Business.findById(id);

  if (!baseBusiness) {
    return res.status(404).json({
      success: false,
      message: "Business not found",
    });
  }

  const businesses = await Business.find({
    status: "approved",
    _id: { $ne: id },
    $or: [
      { categoryId: baseBusiness.categoryId },
      { secondaryCategories: baseBusiness.categoryId },
      { parentCategoryId: baseBusiness.parentCategoryId },
    ],
  })
    .sort({ averageRating: -1, isFeatured: -1, views: -1 })
    .limit(Number(limit))
    .lean();

  res.json({ success: true, businesses });
});

// ================= TOP RATED =================
export const getTopRatedBusinesses = asyncHandler(async (req, res) => {
  const { city, category, limit = 10 } = req.query;

  const query = { status: "approved" };

  if (city) query.city = new RegExp(city, "i");

  if (category) {
    query.$or = [
      { categoryId: category },
      { secondaryCategories: category },
      { parentCategoryId: category },
    ];
  }

  const businesses = await Business.find(query)
    .sort({ averageRating: -1, totalReviews: -1 })
    .limit(Number(limit))
    .lean();

  res.json({ success: true, businesses });
});

// ================= VIEW TRACKING =================
export const incrementViews = asyncHandler(async (req, res) => {
  await BusinessView.create({
    business: req.params.id,
    user: req.user?._id || null,
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"],
  });

  await Business.findByIdAndUpdate(req.params.id, {
    $inc: { views: 1 },
  });

  res.json({ success: true });
});

// ================= PHONE CLICK =================
export const phoneClick = asyncHandler(async (req, res) => {
  await Business.findByIdAndUpdate(req.params.id, {
    $inc: { phoneClicks: 1 },
  });

  res.json({ success: true });
});

// ================= WHATSAPP CLICK =================
export const whatsappClick = asyncHandler(async (req, res) => {
  await Business.findByIdAndUpdate(req.params.id, {
    $inc: { whatsappClicks: 1 },
  });

  res.json({ success: true });
});

// ================= SUGGEST SEARCH =================
export const suggestSearch = asyncHandler(async (req, res) => {
  const { q, city } = req.query;

  if (!q) return res.json([]);

  const query = { status: "approved" };

  if (city) query.city = new RegExp(city, "i");

  const businesses = await Business.find({
    ...query,
    $or: [
      { name: new RegExp(q, "i") },
      { tags: new RegExp(q, "i") },
      { keywords: new RegExp(q, "i") },
    ],
  })
    .limit(8)
    .select("name categoryId city")
    .lean();

  res.json(businesses);
});

// ================= UPDATE =================
export const updateBusiness = asyncHandler(async (req, res) => {
  const business = await Business.findById(req.params.id);

  if (!business) {
    return res.status(404).json({ success: false, message: "Not found" });
  }

  if (!isAdmin(req.user) && !business.owner.equals(req.user._id)) {
    return res.status(403).json({ success: false, message: "Not authorized" });
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

  res.json({ success: true, business });
});

// ================= DELETE =================
export const deleteBusiness = asyncHandler(async (req, res) => {
  const business = await Business.findById(req.params.id);

  if (!business) {
    return res.status(404).json({
      success: false,
      message: "Business not found",
    });
  }

  if (!isAdmin(req.user) && !business.owner.equals(req.user._id)) {
    return res.status(403).json({
      success: false,
      message: "Not authorized",
    });
  }

  await business.deleteOne();

  res.json({
    success: true,
    message: "Business deleted successfully",
  });
});



// ================= TRACK CLICK =================
export const trackBusinessClick = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { keyword, city } = req.body;

  const business = await Business.findById(id).select("categoryId");

  // Save click
  await BusinessClick.create({
    business: id,
    user: req.user?._id || null,
    keyword: keyword || null,
    city: city || null,
  });

  // 🔥 PERSONALIZATION LEARNING
  if (req.user && business?.categoryId) {
    await UserPreference.findOneAndUpdate(
      {
        user: req.user._id,
        category: business.categoryId,
      },
      {
        $inc: { score: 5 },
      },
      { upsert: true }
    );
  }

  res.json({ success: true });
});

// ================= RECOMMENDED (UNIFIED ENGINE) =================
export const getRecommendedBusinesses = asyncHandler(async (req, res) => {
  try {
    const { city, category, limit } = req.query;

    const businesses = await unifiedRanking({
      city,
      category,
      limit,
    });

    res.json({
      success: true,
      count: businesses.length,
      businesses,
    });
  } catch (error) {
    console.error("Unified Recommendation Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load recommendations",
    });
  }
});

// ================= PAID =================
export const paidFeatureNotice = asyncHandler(async (req, res) => {
  res.status(403).json({
    success: false,
    message: "This feature will be available soon",
  });
});