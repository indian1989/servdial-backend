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
  // allow only if explicitly bypassed (admin control later)
  if (!this._allowSlugUpdate) {
    return next(new Error("Slug cannot be modified directly"));
  }

  this.slugHistory = this.slugHistory || [];

  if (this._originalSlug && this._originalSlug !== this.slug) {
    if (!this.slugHistory.includes(this._originalSlug)) {
      this.slugHistory.push(this._originalSlug);
    }
  }
}

    // SEO defaults
    if (!this.seoTitle) this.seoTitle = this.name;
    if (!this.seoDescription) {
      this.seoDescription = this.description || `${this.name} services`;
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

categorySchema.index({ slug: 1 }, { unique: true });

export default mongoose.model("Category", categorySchema);