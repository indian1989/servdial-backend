import Business from "../models/Business.js";
import asyncHandler from "express-async-handler";

/*
GET ALL BUSINESSES (ADMIN)
*/
export const getAllBusinessesAdmin = asyncHandler(async (req, res) => {
  const businesses = await Business.find()
    .populate("owner", "name email")
    .populate("cityId", "name slug")
    .populate("categoryId", "name slug")
    .sort({ createdAt: -1 })
    .lean();

  res.json({
    success: true,
    data: businesses,
    meta: {
      total: businesses.length,
    },
  });
});

/*
APPROVE
*/
export const approveBusiness = asyncHandler(async (req, res) => {
  const business = await Business.findById(req.params.id);

  if (!business) {
    return res.status(404).json({
      success: false,
      message: "Business not found",
    });
  }

  business.status = "approved";
  await business.save();

  res.json({
    success: true,
    data: business,
    meta: null,
  });
});

/*
REJECT
*/
export const rejectBusiness = asyncHandler(async (req, res) => {
  const business = await Business.findById(req.params.id);

  if (!business) {
    return res.status(404).json({
      success: false,
      message: "Business not found",
    });
  }

  business.status = "rejected";
  await business.save();

  res.json({
    success: true,
    data: business,
    meta: null,
  });
});

/*
DELETE
*/
export const deleteBusinessAdmin = asyncHandler(async (req, res) => {
  const business = await Business.findById(req.params.id);

  if (!business) {
    return res.status(404).json({
      success: false,
      message: "Business not found",
    });
  }

  await business.deleteOne();

  res.json({
    success: true,
    data: null,
    meta: null,
  });
});

/*
TOGGLE FEATURE
*/
export const toggleFeatured = asyncHandler(async (req, res) => {
  const business = await Business.findById(req.params.id);

  if (!business) {
    return res.status(404).json({
      success: false,
      message: "Business not found",
    });
  }

  business.isFeatured = !business.isFeatured;

  if (business.isFeatured) {
    if (business.featurePriority == null) {
      business.featurePriority = 1;
    }

    if (!business.featuredUntil) {
      const now = new Date();
      business.featuredUntil = new Date(
        now.setDate(now.getDate() + 30)
      );
    }
  } else {
    business.featurePriority = 0;
    business.featuredUntil = null;
  }

  const updated = await business.save();

  res.json({
    success: true,
    data: updated,
    meta: null,
  });
});

/*
STATS
*/
export const getBusinessStats = asyncHandler(async (req, res) => {
  const total = await Business.countDocuments();
  const approved = await Business.countDocuments({ status: "approved" });
  const pending = await Business.countDocuments({ status: "pending" });
  const rejected = await Business.countDocuments({ status: "rejected" });
  const featured = await Business.countDocuments({ isFeatured: true });

  res.json({
    success: true,
    data: {
      total,
      approved,
      pending,
      rejected,
      featured,
    },
    meta: null,
  });
});