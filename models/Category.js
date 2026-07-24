// backend/models/Category.js
import mongoose from "mongoose";
import slugify from "../utils/slugify.js";

const slugHistorySchema = new mongoose.Schema(
  {
    slug: { type: String, lowercase: true, trim: true },
    changedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const categorySchema = new mongoose.Schema(
  {
    /* ================= BASIC ================= */
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    slugHistory: [slugHistorySchema],

    description: {
      type: String,
      default: "",
      trim: true,
    },

    /* ================= HIERARCHY ================= */
    parentCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
      index: true,
    },

    level: {
      type: Number,
      enum: [0, 1], // 0 = parent, 1 = leaf
      default: 0,
      index: true,
    },

    /* ================= MEDIA ================= */
    icon: { type: String, default: "" },
    image: { type: String, default: "" },

/* ================= UI ================= */
uiType: {
  type: String,
  enum: [
    "service",
    "restaurant",
    "hotel",
    "appointment",
    "shopping",
  ],
  default: "service",
  index: true,
},

features:{
  type:[String],
  default:[]
},

    /* ================= SEO ================= */
    seoTitle: String,
    seoDescription: String,

    keywords: [
      {
        type: String,
        lowercase: true,
        trim: true,
      },
    ],

    /* ================= STATUS ================= */
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

    /* ================= ANALYTICS ================= */
    searchCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

/* ================= TEXT SEARCH ================= */
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

/* ================= COMPOUND INDEXES ================= */
categorySchema.index({ parentCategory: 1, status: 1, order: 1 });
categorySchema.index({ parentCategory: 1, level: 1 });

/* ================= UNIQUE INDEX ================= */
categorySchema.index(
  { slug: 1 },
  { unique: true }
);

/* ================= PRE SAVE ================= */
categorySchema.pre("save", async function (next) {
  try {
    this.name = this.name?.trim().replace(/\s+/g, " ");

    if (this.keywords?.length) {
      this.keywords = this.keywords.map((k) =>
        k.toLowerCase().trim()
      );
    }

    // slug generate only on create
    if (this.isNew && this.name) {
      let baseSlug = slugify(this.name);
      let slug = baseSlug;
      let counter = 1;

      while (
        await mongoose.models.Category.findOne({ slug })
      ) {
        slug = `${baseSlug}-${counter++}`;
      }

      this.slug = slug;
    }

    // slug history (safe tracking)
    if (!this.isNew && this.isModified("slug")) {
      const old = await mongoose.models.Category.findById(this._id);

      if (old?.slug && old.slug !== this.slug) {
        this.slugHistory = this.slugHistory || [];

        this.slugHistory.push({
          slug: old.slug,
          changedAt: new Date(),
        });
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

export default mongoose.model("Category", categorySchema);