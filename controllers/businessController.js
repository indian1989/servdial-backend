import asyncHandler from "express-async-handler";
import mongoose from "mongoose";

import Business from "../models/Business.js";
import City from "../models/City.js";
import Category from "../models/Category.js";

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

const generateBusinessSlug = (name) => {
  const base = slugify(name);
  const unique = Date.now().toString(36);
  return `${base}-${unique}`;
};

/* =========================
   CREATE BUSINESS (LOCKED SSOT)
========================= */

export const createBusiness = asyncHandler(async (req, res) => {
  const {
    name,
    categoryId,
    cityId,
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

  requireField(name, "Business name");
  requireField(categoryId, "Category");
  requireField(cityId, "City");
  requireField(phone, "Phone");

  if (!isValidObjectId(categoryId)) {
    return res.status(400).json({ message: "Invalid categoryId" });
  }

  if (!isValidObjectId(cityId)) {
    return res.status(400).json({ message: "Invalid cityId" });
  }

  const cleanPhone = String(phone).replace(/\D/g, "");
  if (cleanPhone.length !== 10) {
    return res.status(400).json({ message: "Phone must be 10 digits" });
  }

  /* ================= RESOLVE CITY ================= */

  const city = await City.findById(cityId);
  if (!city) {
    return res.status(404).json({ message: "City not found" });
  }

  /* ================= RESOLVE CATEGORY ================= */

  const category = await Category.findById(categoryId);
  if (!category) {
    return res.status(404).json({ message: "Category not found" });
  }

  /* ================= LOCATION SAFETY ================= */

  let safeLocation = null;

  if (
    location &&
    location.type === "Point" &&
    Array.isArray(location.coordinates) &&
    location.coordinates.length === 2
  ) {
    safeLocation = {
      type: "Point",
      coordinates: [
        Number(location.coordinates[0]),
        Number(location.coordinates[1]),
      ],
    };
  } else if (city.latitude && city.longitude) {
    safeLocation = {
      type: "Point",
      coordinates: [city.longitude, city.latitude],
    };
  }

  /* ================= BUSINESS CREATION ================= */

  const business = await Business.create({
    name: name.trim(),

    categoryId,
    cityId,

    citySlug: city.slug,
    categorySlug: category.slug,

    slug: generateBusinessSlug(name),

    address: address?.trim() || "",
    phone: cleanPhone,
    whatsapp: whatsapp || "",
    website: website || "",
    description: description || "",

    location: safeLocation,

    logo: logo || "",
    images: Array.isArray(images) ? images : [],

    businessHours: businessHours || {},

    status: "pending",
  });

  res.status(201).json({
    success: true,
    data: business,
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
  business.businessHours = {
    ...business.businessHours,
    ...businessHours,
  };

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
    return res.status(400).json({ message: "Invalid business id" });
  }

  const business = await Business.findById(id)
    .populate("cityId")
    .populate("categoryId");

  if (!business) {
    return res.status(404).json({ message: "Business not found" });
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
    return res.status(400).json({ message: "Invalid business id" });
  }

  const business = await Business.findById(id);
  if (!business) {
    return res.status(404).json({ message: "Business not found" });
  }

  const updates = { ...req.body };

  /* 🚫 HARD PROTECTION LAYER */
  delete updates.slug;
  delete updates.citySlug;
  delete updates.categorySlug;
  delete updates.status; // controlled by system

  /* 🚫 PHONE NORMALIZATION */
  if (updates.phone) {
    updates.phone = String(updates.phone).replace(/\D/g, "");
    if (updates.phone.length !== 10) {
      return res.status(400).json({ message: "Invalid phone number" });
    }
  }

  /* 🚫 OPTIONAL RE-RESOLVE CITY/CATEGORY */
  if (updates.cityId && isValidObjectId(updates.cityId)) {
    const city = await City.findById(updates.cityId);
    if (city) {
      updates.citySlug = city.slug;
    }
  }

  if (updates.categoryId && isValidObjectId(updates.categoryId)) {
    const category = await Category.findById(updates.categoryId);
    if (category) {
      updates.categorySlug = category.slug;
    }
  }

  const updated = await Business.findByIdAndUpdate(id, updates, {
    new: true,
  });

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

  if (!isValidObjectId(id)) {
    return res.status(400).json({ message: "Invalid business id" });
  }

  await Business.findByIdAndDelete(id);

  res.json({
    success: true,
    message: "Business deleted successfully",
  });
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