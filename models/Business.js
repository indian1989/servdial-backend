// backend/models/Business.js
import mongoose from "mongoose";
import slugify from "../utils/slugify.js";

// ================= HELPER =================
const normalizeText = (val) => {
  if (!val) return val;
  return val.toString().trim().replace(/\s+/g, " ");
};

const normalizeCity = (val) => {
  if (!val) return val;
  return val.toString().trim().toLowerCase().replace(/\s+/g, " ");
};

const normalizePhone = (val) => {
  if (!val) return val;
  return val.toString().replace(/\D/g, ""); // keep only numbers
};

// ================= SCHEMA =================
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
  lowercase: true,
  unique: true,
  index: true,
},

slugHistory: [
  {
    type: String,
    lowercase: true,
    trim: true,
  },
],

    services: [String],

    description: {
      type: String,
      trim: true,
    },

    logo: String,
    images: [String],

    // ============= CATEGORY =================
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },

    parentCategoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: false,
      index: true,
    },

    // 🔥 SEO SLUG CACHE (VERY IMPORTANT)

categorySlug: {
  type: String,
  lowercase: true,
  index: true,
},

    
// ================= INTENT TAGS =================
intentTags: [
  {
    type: String,
    lowercase: true,
    trim: true,
  }
],

    // ================= LOCATION =================
    address: String,

cityId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "City",
  required: true,
  index: true,
},

// 🔥 KEEP FOR SEO + fallback (NOT primary)
cityName: {
  type: String,
  lowercase: true,
  index: true,
},

citySlug: {
  type: String,
  lowercase: true,
  index: true,
},

district: String,
state: String,

    pincode: String,

    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
  type: [Number],
  required: true,
  validate: {
    validator: function (val) {
      return Array.isArray(val) && val.length === 2;
    },
    message: "Location must have [lng, lat]",
  },
},
    },

    isDeleted: {
  type: Boolean,
  default: false,
  index: true,
},

    // ================= CONTACT =================
    phone: {
      type: String,
      required: true,
    },

    phoneVerified: {
  type: Boolean,
  default: false,
},

phoneVerifiedAt: Date,

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
  monday: { open: String, close: String, closed: { type: Boolean, default: false } },
  tuesday: { open: String, close: String, closed: { type: Boolean, default: false } },
  wednesday: { open: String, close: String, closed: { type: Boolean, default: false } },
  thursday: { open: String, close: String, closed: { type: Boolean, default: false } },
  friday: { open: String, close: String, closed: { type: Boolean, default: false } },
  saturday: { open: String, close: String, closed: { type: Boolean, default: false } },
  sunday: { open: String, close: String, closed: { type: Boolean, default: false } },
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
    isFeatured: { type: Boolean, default: false },
    featurePriority: { type: Number, default: 0 },
    featuredUntil: Date,

    isVerified: { type: Boolean, default: false },
    isClaimed: { type: Boolean, default: false },

    // ================= STATUS =================
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "suspended"],
      default: "pending",
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

// ================= CAPTURE ORIGINAL SLUG =================
businessSchema.pre("init", function () {
  this._originalSlug = this.slug;
});

// ================= PRE SAVE HOOK =================
businessSchema.pre("save", async function (next) {
  try {
    // ================= BASIC NORMALIZATION =================
    this.name = normalizeText(this.name);
    this.description = normalizeText(this.description);
    this.address = normalizeText(this.address);

    if (this.district) this.district = normalizeText(this.district);
    if (this.state) this.state = normalizeText(this.state);

    // ================= HARD VALIDATION =================
    if (!this.cityId) {
      throw new Error("cityId is required");
    }

    // ================= LOCATION VALIDATION =================
if (!this.location || !Array.isArray(this.location.coordinates)) {
  return next(new Error("Location coordinates must be provided"));
}

if (this.location.coordinates.length !== 2) {
  return next(new Error("Location must have [lng, lat]"));
}

    // ================= CITY SYNC =================
    if (this.isModified("cityId")) {
      const cityDoc = await mongoose.models.City.findById(this.cityId);

      if (!cityDoc) {
        throw new Error("Invalid cityId: City not found");
      }

      this.cityName = normalizeCity(cityDoc.name); // cache only
      this.citySlug = cityDoc.slug;

      this.district = normalizeText(cityDoc.district);
      this.state = normalizeText(cityDoc.state);
    }

    // NEVER trust manual input
if (this.cityName) delete this.cityName;
if (this.citySlug) delete this.citySlug;

    // ================= SAFETY NORMALIZATION =================
    if (this.cityName) {
      this.cityName = normalizeCity(this.cityName);
    }

    // ================= CATEGORY SYNC =================
    if (this.isModified("categoryId")) {
      const categoryDoc = await mongoose.models.Category.findById(this.categoryId);
      if (categoryDoc) {
        this.categorySlug = categoryDoc.slug;
      }
    }
    if (!this.categoryId) {
  throw new Error("categoryId is required");
}

    // ================= PHONE =================
    if (this.phone) {
  this.phone = normalizePhone(this.phone);

  if (this.phone.length !== 10) {
    throw new Error("Phone must be 10 digits");
  }
}
    if (this.whatsapp) this.whatsapp = normalizePhone(this.whatsapp);

    // ================= SLUG GENERATION =================
    if (!this.slug && this.name) {
      let baseSlug = slugify(this.name);
      let slug = baseSlug;
      let counter = 1;

      while (await mongoose.models.Business.findOne({ slug })) {
        slug = `${baseSlug}-${counter++}`;
      }

      this.slug = slug;
    }

    // ================= SLUG HISTORY =================
    if (!this.isNew && this.isModified("slug")) {
      this.slugHistory = this.slugHistory || [];

      if (this._originalSlug && this._originalSlug !== this.slug) {
        if (!this.slugHistory.includes(this._originalSlug)) {
          this.slugHistory.push(this._originalSlug);
        }
      }
    }

    // ================= FEATURE EXPIRY =================
if (this.featuredUntil && this.featuredUntil < new Date()) {
  this.isFeatured = false;
  this.featurePriority = 0;
}

    next();
  } catch (err) {
    next(err);
  }
});

// ================= GLOBAL QUERY FILTER =================
businessSchema.pre(/^find/, function (next) {
  const query = this.getQuery();

  const isAdminQuery =
    this.options?.includeAll === true ||
    query._includeAll === true;

  if (!isAdminQuery) {
    this.where({
      isDeleted: { $ne: true },
      status: "approved",
    });
  }

  next();
});

// ================= INDEXES =================

// 🔍 TEXT SEARCH (for keyword search)
businessSchema.index({
  name: "text",
  description: "text",
  tags: "text",
  keywords: "text",
});

// CORE QUERY INDEX (MOST IMPORTANT)
businessSchema.index({
  cityId: 1,
  categoryId: 1,
  status: 1,
  isDeleted: 1,
});

// RANKING INDEX
businessSchema.index({
  isFeatured: -1,
  featurePriority: -1,
  featuredUntil: 1,
});

// ANALYTICS INDEX
businessSchema.index({
  averageRating: -1,
  totalReviews: -1,
  views: -1,
});

// 🚀 CATEGORY TREE SUPPORT
businessSchema.index({
  parentCategoryId: 1,
});

// 🚀 SEO ROUTING
businessSchema.index({
  citySlug: 1,
  categorySlug: 1,
  slug: 1,
});

// ⚡ UNIQUE
businessSchema.index({ slug: 1 }, { unique: true });

businessSchema.index({ location: "2dsphere" });

// ================= EXPORT =================
export default mongoose.model("Business", businessSchema);