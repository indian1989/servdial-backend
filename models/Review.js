// backend/models/Review.js

import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
{
  business: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Business",
    required: true,
    index: true
  },

  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    index: true
  },

  name: {
    type: String,
    required: true,
    trim: true
  },

  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
    index: true
  },

  comment: {
    type: String,
    default: "",
    trim: true
  },

  // moderation
  isApproved: {
    type: Boolean,
    default: true,
    index: true
  },

  // optional helpful votes
  helpfulCount: {
    type: Number,
    default: 0
  }

},
{
  timestamps: true
}
);


// ================= INDEXES =================

// Fast business reviews loading
reviewSchema.index({ business: 1, createdAt: -1 });

// Prevent duplicate review from same user
reviewSchema.index({ business: 1, user: 1 }, { unique: false });

export default mongoose.model("Review", reviewSchema);