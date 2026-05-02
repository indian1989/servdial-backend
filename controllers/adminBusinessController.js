import asyncHandler from "express-async-handler";
import Business from "../models/Business.js";

/* ================= GET ALL (ADMIN) ================= */
export const getAllBusinessesAdmin = asyncHandler(async (req, res) => {
  const businesses = await Business.find()
    .populate("cityId", "name slug")
    .populate("categoryId", "name slug")
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    data: businesses,
  });
});

/* ================= APPROVE ================= */
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
  });
});

/* ================= REJECT ================= */
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
  });
});

/* ================= DELETE ================= */
export const deleteBusinessAdmin = asyncHandler(async (req, res) => {
  const business = await Business.findByIdAndDelete(req.params.id);

  if (!business) {
    return res.status(404).json({
      success: false,
      message: "Business not found",
    });
  }

  res.json({
    success: true,
    message: "Business deleted",
  });
});

/* ================= FEATURE TOGGLE ================= */
export const toggleFeatured = asyncHandler(async (req, res) => {
  const business = await Business.findById(req.params.id);

  if (!business) {
    return res.status(404).json({
      success: false,
      message: "Business not found",
    });
  }

  business.isFeatured = !business.isFeatured;
  await business.save();

  res.json({
    success: true,
    data: business,
  });
});

/* ================= STATS ================= */
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
  });
});