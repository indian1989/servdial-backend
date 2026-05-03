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
    unique: true,
    lowercase: true,
    trim: true,
    match: /^[a-z0-9-]+$/,
    index: true
  },

  slugHistory: [
    {
      type: String,
      lowercase: true,
      trim: true,
    },
  ],

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

  // ================= NEW STRUCTURE =================
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
      default: "Point" // ✅ FIX
    },
    coordinates: {
      type: [Number],
      default: undefined // ✅ prevents empty [0,0] garbage
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


// ================= UNIQUE =================
citySchema.index(
  { name: 1, state: 1, district: 1 },
  { unique: true }
);


// ================= PRE SAVE =================
citySchema.pre("save", async function (next) {
  try {

    // ================= VALIDATION =================
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

    // slug history
    if (this.slug && this.slug !== slug) {
      this.slugHistory = this.slugHistory || [];
      if (!this.slugHistory.includes(this.slug)) {
        this.slugHistory.push(this.slug);
      }
    }

    this.slug = slug;

    // ================= SLUGS =================
    this.stateSlug = slugify(this.state);
    this.districtSlug = slugify(this.district);

    // ================= GEO FIX (IMPORTANT) =================
    if (
      this.latitude !== null &&
      this.longitude !== null &&
      !isNaN(this.latitude) &&
      !isNaN(this.longitude)
    ) {
      this.location = {
        type: "Point",
        coordinates: [this.longitude, this.latitude], // ✅ correct order
      };
    } else {
      this.location = undefined; // ✅ prevents stale geo
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

// 🔍 Filters
citySchema.index({ state: 1, district: 1, status: 1 });
citySchema.index({ slug: 1, status: 1 });
citySchema.index({ stateSlug: 1 });
citySchema.index({ districtSlug: 1 });
citySchema.index({ slugHistory: 1 });

// 🌍 GEO
citySchema.index({ location: "2dsphere" });


export default mongoose.models.City || mongoose.model("City", citySchema);