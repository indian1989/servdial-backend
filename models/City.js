// backend/models/City.js
import mongoose from "mongoose";
import slugify from "../utils/slugify.js";

const citySchema = new mongoose.Schema(
{
  // ================= BASIC =================
  name: {
    type: String,
    required: true,
    trim: true,
    index: true
  },

  slug: {
  type: String,
  required: false,
  unique: true,
  lowercase: true,
  trim: true,
  match: /^[a-z0-9-]+$/,   // ✅ enforce URL-safe slug
  index: true
},

slugHistory: [
  {
    type: String,
    lowercase: true,
    trim: true,
  },
],

  // ✅ KEEP THESE (YOU REMOVED EARLIER - WRONG)
  state: {
    type: String,
    required: true,
    trim: true,
    index: true
  },

  district: {
    type: String,
    required: true,
    trim: true,
    index: true
  },

  // ================= NEW STRUCTURE (ADD ONLY) =================
  stateSlug: {
    type: String,
    lowercase: true,
    index: true
  },

  districtSlug: {
    type: String,
    lowercase: true,
    index: true
  },

  country: {
    type: String,
    default: "India",
    trim: true
  },

  // ================= GEO =================
  latitude: {
    type: Number,
    default: null
  },

  longitude: {
    type: Number,
    default: null
  },

  location: {
    type: {
      type: String,
      enum: ["Point"],
    },
    coordinates: {
      type: [Number], // [lng, lat]
    }
  },

  // ================= DISPLAY =================
  isFeatured: {
    type: Boolean,
    default: false
  },

  popular: {
    type: Boolean,
    default: false
  },

  image: {
    type: String,
    default: ""
  },

  // ================= STATUS =================
  status: {
    type: String,
    enum: ["active","inactive"],
    default: "active",
    index: true
  }

},
{
  timestamps: true
}
);


// ================= UNIQUE CITY PER STATE + DISTRICT =================
citySchema.index(
  { name: 1, state: 1, district: 1 },
  { unique: true }
);


// ================= AUTO SLUG + HISTORY (BLUEPRINT STRICT) =================
citySchema.pre("save", async function (next) {
  try {
    // ================= VALIDATION SAFETY =================
    if (!this.name || !this.state || !this.district) {
      return next(new Error("Missing required fields before save"));
    }

    // ================= SLUG =================
    let baseSlug = slugify(`${this.name}-${this.district}-${this.state}`);
    let slug = baseSlug;
    let count = 1;

    while (
      await mongoose.models.City.findOne({
        slug,
        _id: { $ne: this._id },
      })
    ) {
      slug = `${baseSlug}-${count++}`;
    }

    // 🔥 slugHistory support (BLUEPRINT)
    if (this.slug && this.slug !== slug) {
      this.slugHistory = this.slugHistory || [];
      if (!this.slugHistory.includes(this.slug)) {
        this.slugHistory.push(this.slug);
      }
    }

    this.slug = slug;

    // ================= STATE / DISTRICT SLUG =================
    this.stateSlug = slugify(this.state);
    this.districtSlug = slugify(this.district);

    // ================= GEO =================
    if (this.latitude && this.longitude) {
      this.location = {
        type: "Point",
        coordinates: [this.longitude, this.latitude],
      };
    }

    next();

  } catch (err) {
    next(err);
  }
});

// ================= INDEXES =================

// 🔍 Search
citySchema.index({
  name: "text",
  state: "text",
  district: "text"
});

// 🔍 Filter
citySchema.index({ state: 1, district: 1, status: 1 });
citySchema.index({ slug: 1 });
citySchema.index({ stateSlug: 1 });
citySchema.index({ districtSlug: 1 });
citySchema.index({ status: 1 });

citySchema.index({ slug: 1, status: 1 });
citySchema.index({ slugHistory: 1 });

// 🌍 Geo
citySchema.index({ location: "2dsphere" });


export default mongoose.models.City || mongoose.model("City", citySchema);