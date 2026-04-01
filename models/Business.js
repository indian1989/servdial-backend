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
    },

    secondaryCategories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
      },
    ],

    // ================= LOCATION =================
    address: String,

    city: {
      type: String,
      required: true,
      index: true, // ⚡ important for filtering
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
    if (this.city) this.city = normalizeCity(this.city);
    if (this.district) this.district = normalizeText(this.district);
    if (this.state) this.state = normalizeText(this.state);

    // ✅ Normalize phone numbers
    if (this.phone) this.phone = normalizePhone(this.phone);
    if (this.whatsapp) this.whatsapp = normalizePhone(this.whatsapp);

    // ✅ Auto slug
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
  } catch (err) {
    next(err);
  }
});

// ================= INDEXES =================

// 🔍 TEXT SEARCH
businessSchema.index({
  name: "text",
  description: "text",
  city: "text",
  tags: "text",
  keywords: "text",
});

// 📍 GEO INDEX
businessSchema.index({ location: "2dsphere" });

// ⚡ CORE SEARCH INDEX (VERY IMPORTANT FOR SCALE)
businessSchema.index({
  city: 1,
  status: 1,
  categoryId: 1,
  parentCategoryId: 1,
  isFeatured: -1,
  featurePriority: -1,
  averageRating: -1,
  views: -1,
});

// ⚡ SORTING
businessSchema.index({ averageRating: -1 });
businessSchema.index({ createdAt: -1 });
businessSchema.index({ views: -1 });

// ⚡ UNIQUE
businessSchema.index({ slug: 1 }, { unique: true });

// ================= EXPORT =================
export default mongoose.model("Business", businessSchema);