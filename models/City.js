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
    unique: true,
    lowercase: true,
    index: true
  },

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
  featured: {
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


// ================= AUTO SLUG =================
citySchema.pre("save", async function(next){
  try {
    if (!this.isModified("name")) return next();

    let baseSlug = slugify(this.name);
    let slug = baseSlug;
    let count = 1;

    while (
      await mongoose.models.City.findOne({
        slug,
        _id: { $ne: this._id }
      })
    ) {
      slug = `${baseSlug}-${count++}`;
    }

    this.slug = slug;

    next();
  } catch (err) {
    next(err);
  }
});


// ================= AUTO STATE + DISTRICT SLUG =================
citySchema.pre("save", function(next){

  if (this.state) {
    this.stateSlug = slugify(this.state);
  }

  if (this.district) {
    this.districtSlug = slugify(this.district);
  }

  next();
});


// ================= AUTO GEO SYNC =================
citySchema.pre("save", function(next){

  if (this.latitude && this.longitude) {
    this.location = {
      type: "Point",
      coordinates: [this.longitude, this.latitude]
    };
  }

  next();
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

// 🌍 Geo
citySchema.index({ location: "2dsphere" });


export default mongoose.model("City", citySchema);