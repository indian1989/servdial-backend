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
      unique: true,
      lowercase: true,
    },

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

    // 0 = Parent Category (Home Services)
    // 1 = Child Category (Electrician)
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
    if (!this.isModified("name") && this.slug) return next();

    const cleanName = this.name
      ?.toString()
      .trim()
      .replace(/\s+/g, " ");

    if (!cleanName) {
      return next(new Error("Invalid category name for slug generation"));
    }

    let baseSlug = slugify(cleanName);

    if (!baseSlug) {
      baseSlug = `category-${Date.now()}`;
    }

    let slug = baseSlug;
    let counter = 1;

    while (
      await mongoose.models.Category.exists({
        slug,
        _id: { $ne: this._id },
      })
    ) {
      slug = `${baseSlug}-${counter++}`;

      if (counter > 50) {
        slug = `${baseSlug}-${Date.now()}`;
        break;
      }
    }

    this.slug = slug;

    if (!this.seoTitle) {
      this.seoTitle = this.name;
    }

    if (!this.seoDescription) {
      this.seoDescription =
        this.description || `${this.name} services`;
    }

    next();
  } catch (err) {
    next(err);
  }
});

export default mongoose.model("Category", categorySchema);