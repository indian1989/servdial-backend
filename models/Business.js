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
  required: true,
  unique: true,
},

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
      required: true,
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
        type: [Number], // [lng, lat]
        default: [0, 0],
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

// ================= PRE SAVE HOOK =================
businessSchema.pre("save", async function (next) {
  try {
    // ✅ Normalize text fields
    this.name = normalizeText(this.name);
    this.description = normalizeText(this.description);
    this.address = normalizeText(this.address);

    // ✅ Normalize location fields (CRITICAL FIX)
    
    if (this.district) this.district = normalizeText(this.district);
    if (this.state) this.state = normalizeText(this.state);

    // ✅ AUTO FILL cityName for SEO
// ================= AUTO CITY SYNC =================
if (this.isModified("cityId")) {
  const cityDoc = await mongoose.models.City.findById(this.cityId);

  if (cityDoc) {
    this.cityName = normalizeCity(cityDoc.name);
    this.district = normalizeText(cityDoc.district);
    this.state = normalizeText(cityDoc.state);
  }
}

// 🔥 SAFETY: ensure consistency even if manually set somewhere
if (this.cityName) {
  this.cityName = normalizeCity(this.cityName);
}

// ================= AUTO CATEGORY + CITY SLUG =================
if (this.isModified("categoryId")) {
  const categoryDoc = await mongoose.models.Category.findById(this.categoryId);
  if (categoryDoc) {
    this.categorySlug = categoryDoc.slug;
  }
}

if (this.isModified("cityId")) {
  const cityDoc = await mongoose.models.City.findById(this.cityId);
  if (cityDoc) {
    this.citySlug = cityDoc.slug;
  }
}

    // ✅ Normalize phone numbers
    if (this.phone) this.phone = normalizePhone(this.phone);
    if (this.whatsapp) this.whatsapp = normalizePhone(this.whatsapp);

    // ✅ Auto slug
    if (!this.slug && this.name) {
  let baseSlug = slugify(
    `${this.name}-${this.cityName || ""}`
  );
      let slug = baseSlug;
      let counter = 1;

      while (await mongoose.models.Business.findOne({ slug })) {
        slug = `${baseSlug}-${counter++}`;
      }

      this.slug = slug;
    }

    next();
  } catch (err) {
    next(err);
  }
});

// ================= INDEXES =================

// 🔍 TEXT SEARCH (for keyword search)
businessSchema.index({
  name: "text",
  description: "text",
  tags: "text",
  keywords: "text",
  cityName: "text",
  categorySlug: "text",
});

// 📍 GEO SEARCH
businessSchema.index({ location: "2dsphere" });

// 🚀 MAIN SEARCH INDEX (MOST IMPORTANT)
businessSchema.index({
  cityId: 1,
  categoryId: 1,
  status: 1,
  isDeleted: 1,
  isFeatured: -1,
  featurePriority: -1,
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

// 🚀 FILTERS (LIGHTWEIGHT)
businessSchema.index({
  cityId: 1,
  categoryId: 1,
  status: 1,
});

// ⚡ UNIQUE
businessSchema.index({ slug: 1 }, { unique: true });

// ================= EXPORT =================
export default mongoose.model("Business", businessSchema);