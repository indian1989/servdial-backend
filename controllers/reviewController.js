import asyncHandler from "express-async-handler";

import Review from "../models/Review.js";
import Business from "../models/Business.js";

// ======================================================
// CREATE REVIEW
// ======================================================
export const createReview = asyncHandler(async (req, res) => {
  const {
    businessId,
    rating,
    comment = "",
    name,
    fingerprint,
  } = req.body;

  // ================= VALIDATION =================
  if (!businessId || !rating || !name) {
    return res.status(400).json({
      success: false,
      message: "Missing required review fields",
    });
  }

  // ================= BUSINESS EXISTS =================
  const business = await Business.findById(businessId);

  if (!business) {
    return res.status(404).json({
      success: false,
      message: "Business not found",
    });
  }

  // ================= USER =================
  const userId = req.user?._id || null;

  // ================= DUPLICATE CHECK (USER) =================
  if (userId) {
    const existingUserReview = await Review.findOne({
      businessId,
      userId,
      isDeleted: false,
    });

    if (existingUserReview) {
      return res.status(400).json({
        success: false,
        message: "You already reviewed this business",
      });
    }
  }

  // ================= DUPLICATE CHECK (FINGERPRINT) =================
  if (fingerprint) {
    const existingFingerprintReview = await Review.findOne({
      businessId,
      fingerprint,
      createdDay: new Date().toISOString().split("T")[0],
      isDeleted: false,
    });

    if (existingFingerprintReview) {
      return res.status(400).json({
        success: false,
        message: "Duplicate review detected",
      });
    }
  }

  // ================= CREATE REVIEW =================
  const review = await Review.create({
    businessId,
    userId,
    name,
    rating,
    comment,

    fingerprint,

    ipAddress:
      req.headers["x-forwarded-for"]?.split(",")[0] ||
      req.socket?.remoteAddress ||
      req.ip,

    userAgent: req.headers["user-agent"] || "",

    isVerified: !!userId,
    isApproved: true, // 👈 consistent moderation system
  });

  // ======================================================
  // RECALCULATE BUSINESS RATINGS
  // ======================================================
  const stats = await Review.aggregate([
    {
      $match: {
        businessId: business._id,
        isApproved: true,
        isDeleted: false,
      },
    },
    {
      $group: {
        _id: "$businessId",
        averageRating: { $avg: "$rating" },
        totalReviews: { $sum: 1 },
      },
    },
  ]);

  const averageRating = Number(
    (stats[0]?.averageRating || 0).toFixed(1)
  );

  const totalReviews = stats[0]?.totalReviews || 0;

  // ================= UPDATE BUSINESS =================
  await Business.findByIdAndUpdate(businessId, {
    averageRating,
    totalReviews,
  });

  // ================= RESPONSE =================
  return res.status(201).json({
    success: true,
    data: review,
  });
});

// ======================================================
// GET BUSINESS REVIEWS
// ======================================================
export const getBusinessReviews = asyncHandler(async (req, res) => {
  const { businessId } = req.params;

  const reviews = await Review.find({
    businessId,
    isApproved: true,
    isDeleted: false,
  })
    .sort({ createdAt: -1 })
    .lean();

  return res.json({
    success: true,
    data: reviews,
    meta: {
      total: reviews.length,
    },
  });
});