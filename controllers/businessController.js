import asyncHandler from "express-async-handler";
import mongoose from "mongoose";

import Business from "../models/Business.js";
import City from "../models/City.js";
import Category from "../models/Category.js";
import Review from "../models/Review.js";
import { normalizeBusinessHours } from "../utils/normalizeBusinessHours.js";
import { rankBusinesses } from "../services/ranking/unifiedRankingEngine.js";

import slugify from "../utils/slugify.js";

/* =========================
   CORE VALIDATION HELPERS
========================= */

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const requireField = (field, name) => {
  if (!field || (typeof field === "string" && !field.trim())) {
    throw new Error(`${name} is required`);
  }
};

/* =========================
   SLUG GENERATOR (CONTROLLED)
========================= */

const generateBusinessSlug = async (name) => {
  const base = slugify(name);
  let slug = base;
  let counter = 1;

  while (await Business.findOne({ slug })) {
    slug = `${base}-${counter++}`;
  }

  return slug;
};

/* =========================
   CREATE BUSINESS (LOCKED SSOT)
========================= */

export const createBusiness = asyncHandler(async (req, res) => {
  const {
    name,
    categoryId,
    cityId,
    pincode,
    address,
    phone,
    whatsapp,
    website,
    description,
    location,
    logo,
    images,
    businessHours,
  } = req.body;

  /* ================= VALIDATION ================= */

  try {
  requireField(name, "Business name");
  requireField(categoryId, "Category");
  requireField(cityId, "City");
  requireField(pincode, "Pincode");
  requireField(phone, "Phone");
} catch (err) {
  return res.status(400).json({
    success: false,
    message: err.message,
  });
}

  if (!isValidObjectId(categoryId)) {
    return res.status(400).json({
  success: false,
  message: "Invalid categoryId",
});
  }

  if (!isValidObjectId(cityId)) {
    return res.status(400).json({
  success: false,
  message: "Invalid cityId",
});
  }

  const cleanPincode = String(pincode).replace(/\D/g, "");

if (cleanPincode.length !== 6) {
  return res.status(400).json({
    success: false,
    message: "Pincode must be 6 digits",
  });
}

  const cleanPhone = String(phone).replace(/\D/g, "");
  if (cleanPhone.length !== 10) {
    return res.status(400).json({
  success: false,
  message: "Phone must be 10 digits",
});
  }

  /* ================= RESOLVE CITY ================= */

  const city = await City.findById(cityId);
  if (!city) {
    return res.status(404).json({
  success: false,
  message: "City not found",
});
  }

  /* ================= RESOLVE CATEGORY ================= */

  const category = await Category.findById(categoryId);
  if (!category) {
    return res.status(404).json({
  success: false,
  message: "Category not found",
});
  }

  /* ================= LOCATION SAFETY ================= */

let safeLocation = null;

if (
  location &&
  location.type === "Point" &&
  Array.isArray(location.coordinates) &&
  location.coordinates.length === 2
) {
  const lng = Number(location.coordinates[0]);
  const lat = Number(location.coordinates[1]);

  // ✅ strict NaN + range validation
  if (
    !isNaN(lat) &&
    !isNaN(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  ) {
    safeLocation = {
      type: "Point",
      coordinates: [lng, lat],
    };
  }
}

/* ===== FALLBACK TO CITY ===== */
if (!safeLocation) {
  const cityLat = Number(city.latitude);
  const cityLng = Number(city.longitude);

  if (
    !isNaN(cityLat) &&
    !isNaN(cityLng) &&
    cityLat >= -90 &&
    cityLat <= 90 &&
    cityLng >= -180 &&
    cityLng <= 180
  ) {
    safeLocation = {
      type: "Point",
      coordinates: [cityLng, cityLat],
    };
  }
}

/* ===== FINAL VALIDATION ===== */
if (!safeLocation) {
  return res.status(400).json({
    success: false,
    message: "Valid location required",
  });
}

  /* ================= BUSINESS CREATION ================= */

// ✅ generate slug
const slug = await generateBusinessSlug(name);

// ✅ role-based status
const status =
  req.user?.role === "admin" || req.user?.role === "superadmin"
    ? "approved"
    : "pending";

// ✅ create business
const business = await Business.create({
  name: name.trim(),

  categoryId,
  cityId,

  citySlug: city.slug,
  categorySlug: category.slug,

  slug,

  address: address?.trim() || "",
  pincode: cleanPincode,
  phone: cleanPhone,
  whatsapp: whatsapp || "",
  website: website || "",
  description: description || "",

  location: safeLocation,

  logo: logo || "",
  images: Array.isArray(images) ? images : [],

  businessHours: normalizeBusinessHours(businessHours || {}),

  status,
});

// ✅ response
const populatedBusiness = await Business.findById(
  business._id
)
  .populate("cityId", "name slug")
  .populate("categoryId", "name slug");

res.status(201).json({
  success: true,
  data: populatedBusiness,
});
});

/* =========================================================
   UPDATE BUSINESS HOURS (PROVIDER)
========================================================= */
export const updateBusinessHours = asyncHandler(async (req, res) => {
  const { businessId, businessHours } = req.body;
  const userId = req.user?._id;

  if (!businessId || !businessHours) {
    return res.status(400).json({
      success: false,
      message: "Business ID and businessHours required",
    });
  }

  const business = await Business.findById(businessId);

  if (!business) {
    return res.status(404).json({
      success: false,
      message: "Business not found",
    });
  }

  // ownership check (important security layer)
  if (String(business.owner) !== String(userId)) {
    return res.status(403).json({
      success: false,
      message: "Unauthorized access",
    });
  }

  // basic safe merge (no schema break risk)
  business.businessHours = normalizeBusinessHours({
  ...business.businessHours,
  ...businessHours,
});

  await business.save();

  return res.json({
    success: true,
    message: "Business hours updated successfully",
    data: business.businessHours,
  });
});

/* =========================
   GET BUSINESSES (BASE)
========================= */

export const getBusinesses = asyncHandler(async (req, res) => {
  const businesses = await Business.find()
    .populate("cityId", "name slug latitude longitude")
    .populate("categoryId", "name slug");

  res.json({
    success: true,
    data: businesses,
  });
});

/* =========================
   GET SINGLE BUSINESS
========================= */

export const getBusinessById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    return res.status(400).json({
  success: false,
  message: "Invalid business id",
});
  }

  const business = await Business.findById(id)
    .populate("cityId")
    .populate("categoryId");

  if (!business) {
    return res.status(404).json({
  success: false,
  message: "Business not found",
});
  }

  res.json({
    success: true,
    data: business,
  });
});

/* =========================================================
   CLAIM BUSINESS (PROVIDER FLOW)
========================================================= */
export const claimBusiness = asyncHandler(async (req, res) => {
  const { businessId } = req.body;
  const userId = req.user?._id;

  if (!businessId) {
    return res.status(400).json({
      success: false,
      message: "Business ID required",
    });
  }

  const business = await Business.findById(businessId);

  if (!business) {
    return res.status(404).json({
      success: false,
      message: "Business not found",
    });
  }

  // already claimed
  if (business.isClaimed) {
    return res.status(400).json({
      success: false,
      message: "Business already claimed",
    });
  }

  // assign owner
  business.owner = userId;
  business.isClaimed = true;
  business.status = "pending"; // admin approval flow

  await business.save();

  return res.json({
    success: true,
    message: "Business claim submitted for approval",
    data: business,
  });
});

/* =========================
   UPDATE BUSINESS (STRICT LOCK)
========================= */

export const updateBusiness = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid business id",
    });
  }

  const business = await Business.findById(id);

  if (!business) {
    return res.status(404).json({
      success: false,
      message: "Business not found",
    });
  }

  const updates = { ...req.body };

  /* ================= HARD PROTECTION ================= */

  delete updates.slug;
  delete updates.citySlug;
  delete updates.categorySlug;
  delete updates.status;

  /* ================= PINCODE ================= */

  if (updates.pincode) {
    updates.pincode = String(updates.pincode)
      .replace(/\D/g, "");

    if (updates.pincode.length !== 6) {
      return res.status(400).json({
        success: false,
        message: "Invalid pincode",
      });
    }
  }

  /* ================= PHONE ================= */

  if (updates.phone) {
    updates.phone = String(updates.phone)
      .replace(/\D/g, "");

    if (updates.phone.length !== 10) {
      return res.status(400).json({
        success: false,
        message: "Invalid phone number",
      });
    }
  }

  /* ================= CITY RESOLVE ================= */

  if (updates.cityId) {
    if (!isValidObjectId(updates.cityId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid cityId",
      });
    }

    const city = await City.findById(updates.cityId);

    if (!city) {
      return res.status(404).json({
        success: false,
        message: "City not found",
      });
    }

    updates.citySlug = city.slug;
  }

  /* ================= CATEGORY RESOLVE ================= */

  if (updates.categoryId) {
    if (!isValidObjectId(updates.categoryId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid categoryId",
      });
    }

    const category = await Category.findById(
      updates.categoryId
    );

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    updates.categorySlug = category.slug;
  }

  /* ================= HOURS NORMALIZATION ================= */

  if (updates.businessHours) {
    updates.businessHours =
      normalizeBusinessHours(
        updates.businessHours
      );
  }

  /* ================= UPDATE ================= */

  const updated = await Business.findByIdAndUpdate(
    id,
    updates,
    {
      new: true,
      runValidators: true,
    }
  )
    .populate("cityId", "name slug")
    .populate("categoryId", "name slug");

  /* ================= RESPONSE ================= */

  res.json({
    success: true,
    data: updated,
  });
});

/* =========================
   DELETE BUSINESS
========================= */

export const deleteBusiness = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // ✅ Validate ID
  if (!isValidObjectId(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid business id",
    });
  }

  const deleted = await Business.findByIdAndDelete(id);

  if (!deleted) {
    return res.status(404).json({
      success: false,
      message: "Business not found",
    });
  }

  res.json({
    success: true,
    message: "Business deleted successfully",
    data: null,
  });
});

// ================================
// MANAGE BUSINESS MEDIA
// ================================
export const updateBusinessMedia = asyncHandler(async (req, res) => {
  const business = await Business.findById(req.params.id);

  if (!business) {
    return res.status(404).json({
  success: false,
  message: "Business not found",
});
  }

  business.images = req.body.images || business.images;
  await business.save();

  res.json({
  success: true,
  message: "Business media updated",
  data: business.images,
});
});

// ================= GET BUSINESS BY SLUG =================
export const getBusinessBySlug = asyncHandler(async (req, res) => {
  const { slug } = req.params;

  if (!slug) {
    return res.status(400).json({
      success: false,
      message: "Slug is required",
    });
  }

  const business = await Business.findOne({
    slug,
    status: "approved",
    isDeleted: false,
  })
    .populate("cityId", "name slug")
    .populate("categoryId", "name slug")
    .lean();

  if (!business) {
    return res.status(404).json({
      success: false,
      message: "Business not found",
    });
  }

  // 🔥 OPTIONAL: fetch reviews here if needed
  const reviews = await Review.find({ businessId: business._id })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  res.json({
  success: true,
  data: {
    business,
    reviews,
  },
});
});

// ================= GET BUSINESS COUNT =================
export const getBusinessCount = asyncHandler(async (req, res) => {
  const { categoryId, cityId } = req.query;

  const filter = {
    status: "approved",
    isDeleted: false,
  };

  if (categoryId) filter.categoryId = categoryId;
  if (cityId) filter.cityId = cityId;

  const count = await Business.countDocuments(filter);

  res.json({
    success: true,
    data: { count },
  });
});

// ================= GET SIMILAR BUSINESS =================
export const getSimilarBusinesses = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // ✅ Validate ID
  if (!isValidObjectId(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid business id",
    });
  }

  // ✅ Get base business
  const base = await Business.findById(id).lean();

  if (!base) {
    return res.status(404).json({
      success: false,
      message: "Base business not found",
    });
  }

  // ✅ Find similar businesses
  const raw = await Business.find({
    _id: { $ne: id },
    cityId: base.cityId,
    categoryId: base.categoryId,
    status: "approved",
    isDeleted: false,
  })
    .limit(20)
    .lean();

  // ✅ Ranking layer
  const ranked = await rankBusinesses(
    raw,
    {},
    "",
    {},
    null,
    base.cityId
  );

  // ✅ Final response
  res.json({
    success: true,
    data: ranked.slice(0, 8),
  });
});

// ================= Track BUSINESS VIEW =================
export const trackBusinessView = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // ✅ Validate ID
  if (!isValidObjectId(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid business id",
    });
  }

  const updated = await Business.findByIdAndUpdate(
    id,
    { $inc: { views: 1 } },
    { new: true }
  );

  if (!updated) {
    return res.status(404).json({
      success: false,
      message: "Business not found",
    });
  }

  res.json({
    success: true,
    data: null,
  });
});

/* =========================
   GET LATEST BUSINESSES
========================= */

export const getLatestBusinesses = asyncHandler(async (req, res) => {
  const { city, limit = 12 } = req.query;

  const filter = {
    status: "approved",
    isDeleted: false,
  };

  // ================= CITY RESOLVE =================
  if (city) {
    const cityDoc = await City.findOne({
      slug: city,
    }).select("_id");

    if (cityDoc) {
      filter.cityId = cityDoc._id;
    }
  }

  // ================= FETCH =================
  const rawBusinesses = await Business.find(filter)
    .populate("cityId", "name slug")
    .populate("categoryId", "name slug")
    .sort({ createdAt: -1 })
    .limit(Number(limit))
    .lean();

  // ================= RANK =================
  const ranked = await rankBusinesses(
    rawBusinesses,
    {},
    "",
    { intent: "latest" },
    req.user?._id || null,
    filter.cityId || null
  );

  // ================= RESPONSE =================
  res.json({
    success: true,
    data: ranked,
  });
});