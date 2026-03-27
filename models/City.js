import mongoose from "mongoose";
import slugify from "../utils/slugify.js";

const citySchema = new mongoose.Schema(
{
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

  state: {
    type: String,
    required: true,
    trim: true,
    index: true
  },

  district: {
    type: String,
    trim: true,
    default: "" // ✅ prevent undefined
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

  // ✅ FUTURE SAFE (does not break current system)
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


// ================= UNIQUE CITY PER STATE =================
citySchema.index(
  { name: 1, state: 1 },
  { unique: true }
);


// ================= AUTO SLUG (SAFE VERSION) =================
citySchema.pre("save", async function(next){

  try {
    if(!this.isModified("name")) return next();

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


// ================= AUTO GEO SYNC =================
// keeps both systems working
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

// Search
citySchema.index({ name: "text", state: "text", district: "text" });

// Filter
citySchema.index({ state: 1, status: 1 });

// Geo (future use)
citySchema.index({ location: "2dsphere" });


export default mongoose.model("City", citySchema);