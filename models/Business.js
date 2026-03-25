// backend/models/Business.js

import mongoose from "mongoose";
import slugify from "../utils/slugify.js";

const businessSchema = new mongoose.Schema(
  {
    // ================= BASIC INFO =================
    name: {
      type: String,
      required: true,
      trim: true,
    },

    slug: {
      type: String,
      unique: true,
      index: true,
    },

    description: {
      type: String,
      trim: true,
    },

    logo: String,
    images: [String],

    // ================= CATEGORY =================
    category: {
      type: String,
      required: true,
      index: true,
    },

    subCategory: {
      type: String,
      index: true,
    },

    services: [String],

    // ================= LOCATION =================
    address: String,

    city: {
      type: String,
      required: true,
      index: true,
    },

    district: {
      type: String,
      required: true,
    },

    state: {
      type: String,
      required: true,
    },

    pincode: String,

    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], // [lng, lat]
        validate: {
          validator: function (val) {
            return val.length === 2;
          },
          message: "Coordinates must be [lng, lat]",
        },
        default: [0, 0],
      },
    },

    // ================= CONTACT =================
    phone: {
      type: String,
      required: true,
      unique: true,
    },

    whatsapp: String,
    email: String,
    website: String,

    // ================= SOCIAL =================
    socialLinks: {
      facebook: String,
      instagram: String,
      youtube: String,
      twitter: String,
    },

    // ================= BUSINESS HOURS =================
    businessHours: {
      monday: { open: String, close: String },
      tuesday: { open: String, close: String },
      wednesday: { open: String, close: String },
      thursday: { open: String, close: String },
      friday: { open: String, close: String },
      saturday: { open: String, close: String },
      sunday: { open: String, close: String },
    },

    // ================= REVIEWS =================
    averageRating: {
      type: Number,
      default: 0,
    },

    totalReviews: {
      type: Number,
      default: 0,
    },

    // ================= ANALYTICS =================
    views: { type: Number, default: 0 },
    phoneClicks: { type: Number, default: 0 },
    whatsappClicks: { type: Number, default: 0 },
    searchAppearances: { type: Number, default: 0 },

    // ================= SEARCH =================
    tags: [String],
    keywords: [String],

    // ================= FEATURED =================
    isFeatured: {
      type: Boolean,
      default: false,
    },

    featurePriority: {
      type: Number,
      default: 0,
    },

    featuredUntil: Date,

    isVerified: {
      type: Boolean,
      default: false,
    },

    isClaimed: {
      type: Boolean,
      default: false,
    },

    // ================= STATUS =================
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "suspended"],
      default: "pending",
      index: true,
    },

    // ================= OWNER =================
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

// ================= AUTO SLUG =================
businessSchema.pre("save", async function (next) {
  if (!this.slug && this.name) {
    let baseSlug = slugify(this.name);
    let slug = baseSlug;
    let counter = 1;

    while (await mongoose.models.Business.findOne({ slug })) {
      slug = `${baseSlug}-${counter++}`;
    }

    this.slug = slug;
  }

  next();
});

// ================= INDEXES (CLEAN + OPTIMIZED) =================

// 🔍 TEXT SEARCH (single text index only)
businessSchema.index({
  name: "text",
  description: "text",
  category: "text",
  city: "text",
  tags: "text",
  services: "text"
});

// 📍 GEO INDEX (for nearby search)
businessSchema.index({ location: "2dsphere" });

// ⚡ MAIN SEARCH INDEX (MOST IMPORTANT)
businessSchema.index({
  city: 1,
  category: 1,
  status: 1,
  isFeatured: -1,
  featurePriority: -1,
  averageRating: -1,
  views: -1
});

// ⚡ FILTER INDEXES
businessSchema.index({ city: 1 });
businessSchema.index({ category: 1 });
businessSchema.index({ status: 1 });

// ⚡ SORTING INDEXES
businessSchema.index({ averageRating: -1 });
businessSchema.index({ createdAt: -1 });
businessSchema.index({ views: -1 });

// ⚡ UNIQUE SLUG
businessSchema.index({ slug: 1 }, { unique: true });

export default mongoose.model("Business", businessSchema);