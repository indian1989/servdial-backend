// backend/models/Banner.js

import mongoose from "mongoose";

const bannerSchema = new mongoose.Schema(
{
  title: {
    type: String,
    required: true,
    trim: true
  },

  image: {
    type: String,
    required: true
  },

  link: {
    type: String,
    trim: true
  },

  // Banner placement
  position: {
    type: String,
    enum: [
      "homepage_top",
      "homepage_middle",
      "homepage_bottom",
      "category_page",
      "city_page"
    ],
    default: "homepage_top"
  },

  // Display order
  order: {
    type: Number,
    default: 0
  },

  // Optional targeting
  city: {
    type: String
  },

  category: {
    type: String
  },

  // Scheduling
  startDate: {
    type: Date
  },

  endDate: {
    type: Date
  },

  isActive: {
    type: Boolean,
    default: true,
    index: true
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }

},
{
  timestamps: true
}
);


// ================= INDEXES =================

bannerSchema.index({ position: 1 });
bannerSchema.index({ city: 1 });
bannerSchema.index({ category: 1 });

export default mongoose.model("Banner", bannerSchema);