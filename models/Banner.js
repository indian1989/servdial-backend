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
      return !v || /^https?:\/\/.+/.test(v);
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
  enum: ["pending", "paid", "failed"],
  default: "pending"
},

paymentId: {
  type: String
},

role: {
  type: String,
  default: "user"
},

  // Banner placement
  placement: {
    type: String,
    enum: [
      "homepage_top",
      "homepage_middle",
      "homepage_bottom",
      "category_page",
      "city_page"
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

  // Scheduling
  startDate: {
    type: Date
  },

  endDate: {
    type: Date
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
  categoryId: 1
});

export default mongoose.model("Banner", bannerSchema);