import asyncHandler from "express-async-handler";
import Review from "../models/Review.js";
import Business from "../models/Business.js";

// ================= ADD REVIEW =================
export const createReview = asyncHandler(async (req, res) => {

  const { businessId, rating, comment, name } = req.body;

  const review = await Review.create({
    business: businessId,
    rating,
    comment,
    name,
  });

  // Update business rating
  const reviews = await Review.find({ business: businessId });

  const avg =
    reviews.reduce((acc, item) => item.rating + acc, 0) /
    reviews.length;

  await Business.findByIdAndUpdate(businessId, {
    rating: avg.toFixed(1),
    reviewCount: reviews.length,
  });

  res.status(201).json({
    success: true,
    review,
  });

});

// ================= GET BUSINESS REVIEWS =================
export const getBusinessReviews = asyncHandler(async (req, res) => {

  const reviews = await Review.find({
    business: req.params.businessId,
    isApproved: true,
  }).sort({ createdAt: -1 });

  res.json({
    success: true,
    reviews,
  });

});