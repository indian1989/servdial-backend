// backend/models/Category.js
import mongoose from "mongoose";
import slugify from "../utils/slugify.js";

const categorySchema = new mongoose.Schema(
  {
    // ================= BASIC =================
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    slug: {
  type: String,
  lowercase: true,
  required: true,
  unique: true,
},

    slugHistory: [
  {
    type: String,
    lowercase: true,
    trim: true,
  },
],

    description: {
      type: String,
      default: "",
      trim: true,
    },

    // ================= HIERARCHY (🔥 IMPORTANT) =================
    parentCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
      index: true,
    },

    // 🧠 LEVEL (0 = root, 1 = child)
      level: {
        type: Number,
        default: 0,
        index: true,
      },

    // ================= MEDIA =================
    icon: {
      type: String,
      default: "",
    },

    image: {
      type: String,
      default: "",
    },

    // ================= SEO =================
    seoTitle: String,
    seoDescription: String,

    keywords: [
      {
        type: String,
        lowercase: true,
        trim: true,
      },
    ],

    // ================= STATUS =================
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
      index: true,
    },

    order: {
      type: Number,
      default: 0,
      index: true,
    },

    isTrending: {
      type: Boolean,
      default: false,
    },

    meta: {
      title: String,
      description: String,
    },

    // ================= ANALYTICS =================
    searchCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

categorySchema.pre("init", function () {
  this._originalSlug = this.slug;
});

// ================= UNIQUE =================
categorySchema.index(
  { name: 1 },
  {
    unique: true,
    collation: { locale: "en", strength: 2 },
  }
);

// ================= TEXT SEARCH =================
categorySchema.index(
  {
    name: "text",
    description: "text",
    keywords: "text",
  },
  {
    weights: {
      name: 10,
      keywords: 5,
      description: 2,
    },
  }
);

// ================= NORMALIZE =================
categorySchema.pre("save", function (next) {
  if (this.name) {
    this.name = this.name.trim().replace(/\s+/g, " ");
  }

  if (this.keywords?.length) {
    this.keywords = this.keywords.map((k) =>
      k.toLowerCase().trim()
    );
  }

  next();
});

// ================= SLUG =================
categorySchema.pre("save", async function (next) {
  try {

    // ================= ID VALIDATION =================
if (this.parentCategory && !mongoose.Types.ObjectId.isValid(this.parentCategory)) {
  return next(new Error("Invalid parentCategory ID"));
}

    // store original slug
    if (!this.isNew && !this._originalSlug) {
      const existing = await mongoose.models.Category.findById(this._id).select("slug");
      this._originalSlug = existing?.slug;
    }

    // generate slug ONLY if new
    if (this.isNew && this.name) {
      let baseSlug = slugify(this.name);
      let slug = baseSlug;
      let counter = 1;

      while (
        await mongoose.models.Category.exists({ slug })
      ) {
        slug = `${baseSlug}-${counter++}`;
      }

      this.slug = slug;
    }

    // 🚨 prevent accidental slug overwrite
if (!this.isNew && this.isModified("slug")) {
  if (!this._allowSlugUpdate) {
    return next(new Error("Slug modification is restricted"));
  }

  // 🧠 enforce slug normalization
  this.slug = slugify(this.slug);

  // ================= SLUG HISTORY =================
  this.slugHistory = this.slugHistory || [];

  if (this._originalSlug && this._originalSlug !== this.slug) {
    const exists = this.slugHistory.some(
      (s) => s.toLowerCase() === this._originalSlug.toLowerCase()
    );

    if (!exists) {
      this.slugHistory.push(this._originalSlug);
    }
  }

  // 🧠 enforce uniqueness
  this.slugHistory = [...new Set(this.slugHistory)];
}
    // SEO defaults
    if (!this.seoTitle) this.seoTitle = this.name;
    if (!this.seoDescription) {
      this.seoDescription = this.description || `${this.name} services`;
    }

    // ================= HIERARCHY SAFETY =================

// 🚨 prevent self-parenting
if (this.parentCategory && this.parentCategory.equals(this._id)) {
  return next(new Error("Category cannot be its own parent"));
}

// 🚨 validate parent exists
if (this.parentCategory) {
  const parentExists = await mongoose.models.Category.exists({
    _id: this.parentCategory,
  });

  if (!parentExists) {
    return next(new Error("Invalid parentCategory"));
  }
}

// ================= LEVEL AUTO SET =================
if (this.isModified("parentCategory")) {
  if (this.parentCategory) {
    const parent = await mongoose.models.Category.findById(this.parentCategory).select("level");

    this.level = parent ? parent.level + 1 : 1;
  } else {
    this.level = 0;
  }
}

    next();
  } catch (err) {
    next(err);
  }
});

categorySchema.index({
  parentCategory: 1,
  status: 1,
  order: 1,
});

// 🚀 HIERARCHY FETCH OPTIMIZATION (USED IN TREE BUILDING)
categorySchema.index({
  parentCategory: 1,
  level: 1,
});

categorySchema.index({ slug: 1 }, { unique: true });

// 🚀 SLUG HISTORY LOOKUP (CRITICAL FOR SEO FALLBACK)
categorySchema.index({ "slugHistory": 1 });

export default mongoose.model("Category", categorySchema);