import asyncHandler from "express-async-handler";
import Business from "../models/Business.js";
import { pingSearchEngines } from "../services/seo/pingSearchEngines.js";

/* ======================================================
   GET ALL BUSINESSES (ADMIN)
====================================================== */
export const getAllBusinessesAdmin = asyncHandler(async (req, res) => {
  const businesses = await Business.find()
    .setOptions({ includeAll: true })
    .populate("cityId", "name slug")
    .populate("categoryId", "name slug")
    .populate("owner", "name email role")
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    data: businesses,
  });
});

/* ======================================================
   APPROVE BUSINESS
   - SEO ping only on first approval
====================================================== */
export const approveBusiness = asyncHandler(async (req, res) => {
  const business = await Business.findById(req.params.id);

  if (!business) {
    return res.status(404).json({
      success: false,
      message: "Business not found",
    });
  }

  // already approved
  if (business.status === "approved") {
    return res.json({
      success: true,
      message: "Business already approved",
      data: business,
    });
  }

  business.status = "approved";

  // refresh updatedAt for sitemap freshness
  business.updatedAt = new Date();

  await business.save();

  // SEO ping (non-blocking safe)
  try {
    if (business.slug) {
      await pingSearchEngines();
      console.log(
        `✅ SEO ping triggered for business: ${business.slug}`
      );
    }
  } catch (err) {
    console.error(
      "⚠️ SEO ping failed:",
      err.message
    );
  }

  res.json({
    success: true,
    message: "Business approved",
    data: business,
  });
});

/* ======================================================
   REJECT BUSINESS
====================================================== */
export const rejectBusiness = asyncHandler(async (req, res) => {
  const business = await Business.findById(req.params.id);

  if (!business) {
    return res.status(404).json({
      success: false,
      message: "Business not found",
    });
  }

  business.status = "rejected";
  business.updatedAt = new Date();

  await business.save();

  res.json({
    success: true,
    message: "Business rejected",
    data: business,
  });
});

/* ======================================================
   DELETE BUSINESS
====================================================== */
export const deleteBusinessAdmin = asyncHandler(async (req, res) => {
  const business = await Business.findByIdAndDelete(
    req.params.id
  );

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

/* ======================================================
   FEATURE TOGGLE
====================================================== */
export const toggleFeatured = asyncHandler(async (req, res) => {
  const business = await Business.findById(req.params.id);

  if (!business) {
    return res.status(404).json({
      success: false,
      message: "Business not found",
    });
  }

  business.isFeatured = !business.isFeatured;
  business.featurePriority = business.isFeatured ? 10 : 0;
  business.updatedAt = new Date();

  await business.save();

  res.json({
    success: true,
    data: business,
  });
});

/* ======================================================
   VERIFIED TOGGLE
====================================================== */
export const toggleVerifiedBusiness = asyncHandler(async (req, res) => {
  const business = await Business.findById(req.params.id);

  if (!business) {
    return res.status(404).json({
      success: false,
      message: "Business not found",
    });
  }

  business.isVerified = !business.isVerified;
  business.updatedAt = new Date();

  await business.save();

  res.json({
    success: true,
    data: business,
  });
});

/* ======================================================
   BUSINESS STATS
====================================================== */
export const getBusinessStats = asyncHandler(async (req, res) => {
  const [
    total,
    approved,
    pending,
    rejected,
    featured,
  ] = await Promise.all([
    Business.countDocuments(),
    Business.countDocuments({ status: "approved" }),
    Business.countDocuments({ status: "pending" }),
    Business.countDocuments({ status: "rejected" }),
    Business.countDocuments({ isFeatured: true }),
  ]);

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