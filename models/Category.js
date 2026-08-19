// backend/models/Category.js

import mongoose from "mongoose";
import slugify from "../utils/slugify.js";


/* =========================================================
   SLUG HISTORY
========================================================= */

const slugHistorySchema = new mongoose.Schema(
  {
    slug: {
      type: String,
      lowercase: true,
      trim: true,
    },

    changedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    _id: false,
  }
);


/* =========================================================
   CATEGORY SCHEMA
========================================================= */

const categorySchema = new mongoose.Schema(
  {

    /* =====================================================
       BASIC
    ===================================================== */

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

    slugHistory: [
      slugHistorySchema,
    ],

    description: {
      type: String,
      default: "",
      trim: true,
    },


    /* =====================================================
       HIERARCHY
    ===================================================== */

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


    /* =====================================================
       MEDIA
    ===================================================== */

    icon: {
      type: String,
      default: "",
    },

    image: {
      type: String,
      default: "",
    },


    /* =====================================================
       UI TYPE
    ===================================================== */

    uiType: {
      type: String,

      enum: [
        "service",
        "sell-service",
        "restaurant",
        "booking",
        "appointment",
        "shopping",
        "consultation",
      ],

      default: "service",

      index: true,
    },


    /* =====================================================
       CATEGORY FEATURES
       
       These features control which business fields/components
       are shown on BusinessForm.
    ===================================================== */

    features: [
      {
        type: String,

        enum: [

          /* ================= BUSINESS DATA ================= */

          "pricing",
          "services",
          "catalog",


          /* ================= RESTAURANT / MENU ================= */

          "food_menu",


          /* ================= BOOKING ================= */

          "appointment_booking",
          "table_booking",
          "room_booking",
          "party_booking",


          /* ================= ENGAGEMENT ================= */

          "faq",
          "offers",
          "business_hours",


          /* ================= LEAD / INQUIRY ================= */

          "lead_form",

        ],

        trim: true,
      },
    ],


    /* =====================================================
       SEO
    ===================================================== */

    seoTitle: {
      type: String,
      default: "",
    },

    seoDescription: {
      type: String,
      default: "",
    },

    keywords: [
      {
        type: String,
        lowercase: true,
        trim: true,
      },
    ],


    /* =====================================================
       STATUS
    ===================================================== */

    status: {
      type: String,

      enum: [
        "active",
        "inactive",
      ],

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


    /* =====================================================
       ANALYTICS
    ===================================================== */

    searchCount: {
      type: Number,
      default: 0,
    },

  },

  {
    timestamps: true,
  }
);


/* =========================================================
   TEXT SEARCH INDEX
========================================================= */

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


/* =========================================================
   COMPOUND INDEXES
========================================================= */

categorySchema.index({
  parentCategory: 1,
  status: 1,
  order: 1,
});

categorySchema.index({
  parentCategory: 1,
  level: 1,
});


/* =========================================================
   UNIQUE SLUG INDEX
========================================================= */

categorySchema.index(
  {
    slug: 1,
  },
  {
    unique: true,
  }
);


/* =========================================================
   PRE SAVE
========================================================= */

categorySchema.pre(
  "save",
  async function (next) {

    try {

      /* ===================================================
         NORMALIZE NAME
      =================================================== */

      this.name =
        this.name
          ?.trim()
          .replace(/\s+/g, " ");


      /* ===================================================
         NORMALIZE KEYWORDS
      =================================================== */

      if (this.keywords?.length) {

        this.keywords =
          this.keywords.map(
            (keyword) =>
              keyword
                .toLowerCase()
                .trim()
          );

      }


      /* ===================================================
         NORMALIZE FEATURES

         - lowercase
         - trim
         - remove duplicates
      =================================================== */

      if (this.features?.length) {

        this.features = [
          ...new Set(
            this.features
              .map((feature) =>
                String(feature)
                  .trim()
                  .toLowerCase()
              )
              .filter(Boolean)
          ),
        ];

      }

      /* ===================================================
   NORMALIZE SLUG
=================================================== */

if (this.slug) {

  this.slug =
    this.slug
      .toString()
      .trim()
      .toLowerCase();

}


      /* ===================================================
         SLUG GENERATION

         Only generate automatically when creating
         a new category.
      =================================================== */

      if (
        this.isNew &&
        this.name
      ) {

        const baseSlug =
          slugify(this.name);

        let slug =
          baseSlug;

        let counter = 1;

        while (
          await mongoose.models.Category.findOne({
            slug,
          })
        ) {

          slug =
            `${baseSlug}-${counter++}`;

        }

        this.slug =
          slug;
      }


      /* ===================================================
         SLUG HISTORY
      =================================================== */

    
/* ===================================================
   SLUG HISTORY

   When an existing category slug changes:
   old slug is preserved so old SEO URLs can
   resolve to the current category.

   Example:

   old:
   restaurant

   new:
   restaurants

   slugHistory:
   [
     {
       slug: "restaurant",
       changedAt: ...
     }
   ]
=================================================== */

if (
  !this.isNew &&
  this.isModified("slug")
) {

  const oldCategory =
    await mongoose.models.Category
      .findById(this._id)
      .select("slug slugHistory")
      .lean();

  const oldSlug =
    oldCategory?.slug
      ?.toLowerCase()
      ?.trim();

  const newSlug =
    this.slug
      ?.toLowerCase()
      ?.trim();


  /* ===============================================
     Only save a real slug change
  =============================================== */

  if (
    oldSlug &&
    newSlug &&
    oldSlug !== newSlug
  ) {

    const existingHistory =
      Array.isArray(this.slugHistory)
        ? this.slugHistory
        : [];


    /* =============================================
       Avoid duplicate history entries
    ============================================= */

    const alreadyExists =
      existingHistory.some(
        (item) =>
          item?.slug === oldSlug
      );


    if (!alreadyExists) {

      this.slugHistory = [
        ...existingHistory,

        {
          slug: oldSlug,
          changedAt: new Date(),
        },
      ];

    }


    /* =============================================
       Safety:
       Never keep the NEW current slug inside
       slugHistory.
    ============================================= */

    this.slugHistory =
      this.slugHistory.filter(
        (item) =>
          item?.slug &&
          item.slug !== newSlug
      );

  }

}


      /* ===================================================
         SEO DEFAULTS
      =================================================== */

      if (!this.seoTitle) {

        this.seoTitle =
          this.name;

      }

      if (!this.seoDescription) {

        this.seoDescription =
          this.description ||
          `${this.name} services`;

      }


      next();

    } catch (err) {

      next(err);

    }

  }
);


/* =========================================================
   MODEL
========================================================= */

export default mongoose.model(
  "Category",
  categorySchema
);