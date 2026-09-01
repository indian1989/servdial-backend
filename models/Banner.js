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
  trim: true,
  validate: {
    validator: function (v) {
      if (!v) return true;

      try {
        const url = new URL(v);

        return (
          url.protocol === "http:" ||
          url.protocol === "https:"
        );
      } catch (error) {
        return false;
      }
    },
    message: "Invalid URL format"
  }
},

  status: {
  type: String,
  enum: ["pending", "approved", "rejected"],
  default: "pending",
  index: true
},

paymentStatus: {
  type: String,
  enum: ["not_required", "pending", "processing", "paid", "failed", "refunded"],
  default: "pending"
},

price: {
  type: Number,
  required: function () {
    return ["user", "provider"].includes(this.role);
  },
  min: 0
},

// =========================
// BANNER DURATION + PRICING
// =========================
// Customer banner duration is selected at purchase time.
// Pricing is calculated server-side based on placement + duration.
// price remains the FINAL payable amount for payment validation.

durationMonths: {
  type: Number,
  enum: [1, 3, 6, 12],
  default: 1,
  required: function () {
    return ["user", "provider"].includes(this.role);
  },
  min: 1
},

basePrice: {
  type: Number,
  min: 0
},

discountPercent: {
  type: Number,
  enum: [0, 5, 10, 15],
  default: 0,
  min: 0,
  max: 100
},

paymentId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "Payment",
  index: true,
},

role: {
  type: String,
  enum: ["user", "provider", "admin", "superadmin"],
  default: "user",
  index: true
},

  // Banner placement
  placement: {
  type: String,
  enum: [
    // =========================
    // HOMEPAGE
    // =========================
    "homepage_top",
    "homepage_middle",
    "homepage_bottom",

    // =========================
    // CITY PAGE
    // =========================
    "city_page_top",
    "city_page_middle",
    "city_page_bottom",

    // =========================
    // CATEGORY PAGE
    // =========================
    "category_page_top",
    "category_page_middle",
    "category_page_bottom",

    // =========================
    // BUSINESS LISTING SECTIONS
    // =========================
    "featured_business_top",
    "featured_business_bottom",

    "top_rated_business_top",
    "top_rated_business_bottom",

    "latest_business_top",
    "latest_business_bottom",

    // =========================
    // SEARCH RESULTS
    // =========================
    "search_results_top",
    "search_results_bottom",

    // =========================
    // BUSINESS DETAIL PAGE
    // =========================
    "business_detail_middle",
    "business_detail_bottom"
  ],
  default: "homepage_top",
  index: true
},

  // Display order
  order: {
    type: Number,
    default: 0
  },

  // Optional targeting
  cityId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "City",
  index: true
},

categoryId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "Category",
  index: true
},

businessId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "Business",
  index: true
},

  // =========================
// BANNER SCHEDULING
// =========================
// For customer banners:
// startDate = actual admin approval/live date
// endDate = calculated expiry date based on durationMonths.
//
// Example:
// Approval/Live: 31 Aug 2026
// Duration: 1 month
// Start: 31 Aug 2026
// Expiry: 30 Sep 2026

startDate: {
  type: Date,
  index: true
},

endDate: {
  type: Date,
  index: true
},

  // =========================
// BANNER CLICK TRACKING
// =========================

clicks: {
  type: Number,
  default: 0,
  min: 0,
},

  // System toggle (admin and superadmin can disable even approved banner)
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  approvedBy: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "User"
},

approvedAt: {
  type: Date
}

},
{
  timestamps: true
}
);


// ================= INDEXES =================

bannerSchema.index({
  cityId: 1,
  categoryId: 1,
  businessId: 1,
  placement: 1
});
bannerSchema.index({
  status: 1,
  isActive: 1,
  placement: 1
});

bannerSchema.index({ paymentStatus: 1 });
bannerSchema.index({ createdBy: 1 });
bannerSchema.index({ order: 1, createdAt: -1 });
bannerSchema.index({
  status: 1,
  isActive: 1,
  paymentStatus: 1,
  placement: 1,
  cityId: 1,
  categoryId: 1,
  businessId: 1
});

export default mongoose.model("Banner", bannerSchema);