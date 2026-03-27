import mongoose from "mongoose";
import slugify from "../utils/slugify.js";

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    slug: {
      type: String,
      unique: true,
      lowercase: true,
      index: true,
    },

    description: {
      type: String,
      default: "",
      trim: true, // ✅ improvement
    },

    icon: {
      type: String,
      default: "",
    },

    image: {
      type: String,
      default: "",
    },

    parentCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
      index: true,
    },

    // ✅ NEW (NO BREAKING CHANGE)
    level: {
      type: Number,
      default: 0,
      index: true,
    },

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
      index: true,
    },

    order: {
      type: Number,
      default: 0,
      min: 0,
      index: true,
    },

    isTrending: {
      type: Boolean,
      default: false,
    },

    // ✅ NEW (future-proof, no impact now)
    meta: {
      title: String,
      description: String,
    },

  },
  {
    timestamps: true,
  }
);


// ✅ Allow same name under different parents
categorySchema.index(
  { name: 1, parentCategory: 1 },
  { unique: true }
);


// ✅ SLUG GENERATION (SAFE VERSION)
categorySchema.pre("save", async function (next) {
  if (!this.isModified("name")) return next();

  try {
    let baseSlug = slugify(this.name);
    let slug = baseSlug;
    let count = 1;

    while (true) {
      const existing = await mongoose.models.Category.findOne({
        slug,
        _id: { $ne: this._id },
      });

      if (!existing) break;

      slug = `${baseSlug}-${count++}`;
    }

    this.slug = slug;
    next();

  } catch (err) {
    next(err);
  }
});


// ✅ AUTO LEVEL CALCULATION (NEW — SAFE)
categorySchema.pre("save", async function (next) {
  try {
    if (!this.parentCategory) {
      this.level = 0;
      return next();
    }

    const parent = await mongoose.models.Category.findById(this.parentCategory);
    this.level = parent ? (parent.level || 0) + 1 : 0;

    next();
  } catch (err) {
    next(err);
  }
});


// ✅ PREVENT CIRCULAR PARENT (VERY IMPORTANT)
categorySchema.pre("save", async function (next) {
  if (!this.parentCategory) return next();

  if (this.parentCategory.toString() === this._id.toString()) {
    return next(new Error("Category cannot be its own parent"));
  }

  let parent = await mongoose.models.Category.findById(this.parentCategory);

  while (parent) {
    if (parent.parentCategory?.toString() === this._id.toString()) {
      return next(new Error("Circular parent relationship not allowed"));
    }
    parent = await mongoose.models.Category.findById(parent.parentCategory);
  }

  next();
});


// ✅ TEXT SEARCH
categorySchema.index({ name: "text" });

export default mongoose.model("Category", categorySchema);