// backend/models/City.js

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
    trim: true
  },

  country: {
    type: String,
    default: "India"
  },

  // Geo coordinates
  latitude: {
    type: Number
  },

  longitude: {
    type: Number
  },

  // Homepage display
  featured: {
    type: Boolean,
    default: false
  },

  popular: {
    type: Boolean,
    default: false
  },

  image: {
    type: String
  },

  // Enable / disable city
  status: {
    type: String,
    enum: ["active","inactive"],
    default: "active"
  }

},
{
  timestamps: true
}
);


// ================= AUTO SLUG =================

citySchema.pre("save", function(next){

  if(this.isModified("name")){
    this.slug = slugify(this.name)
  }

  next()

});


// ================= INDEXES =================

// Search cities
citySchema.index({ name: "text", state: "text" });

// Fast filter
citySchema.index({ state: 1 });

// Geo index (optional future map search)
citySchema.index({ latitude: 1, longitude: 1 });


export default mongoose.model("City", citySchema);