// backend/models/Category.js

import mongoose from "mongoose";
import slugify from "../utils/slugify.js";

const categorySchema = new mongoose.Schema(
{
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true
  },

  slug: {
    type: String,
    unique: true,
    lowercase: true,
    index: true
  },

  icon: {
    type: String
  },

  image: {
    type: String
  },

  // Optional: allow subcategories later
  parentCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category",
    default: null
  },

  // Enable / disable category
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


// ================= AUTO CREATE SLUG =================

categorySchema.pre("save", function(next){

  if(this.isModified("name")){
    this.slug = slugify(this.name)
  }

  next()

});


// ================= INDEXES =================

categorySchema.index({ name: "text" });


export default mongoose.model("Category", categorySchema);