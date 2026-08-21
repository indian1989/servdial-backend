// backend/models/Business.js
import mongoose from "mongoose";

// ================= HELPER =================
const normalizeText = (val) => {
  if (!val) return val;
  return val.toString().trim().replace(/\s+/g, " ");
};

const normalizeCity = (val) => {
  if (!val) return val;
  return val.toString().trim().toLowerCase().replace(/\s+/g, " ");
};

// ================= SCHEMA =================
const businessSchema = new mongoose.Schema(
  {
    // ================= BASIC INFO =================
    name: {
      type: String,
      required: true,
      trim: true,
    },

slug: {
  type: String,
  lowercase: true,
  index: true,
},

// =========================================================
// 🔗 BUSINESS SLUG HISTORY
// =========================================================

slugHistory: [
  {
    type: String,
    lowercase: true,
    trim: true,
  },
],

    description: {
      type: String,
      trim: true,
    },

    logo: String,
    images: [String],

    // ============= CATEGORY =================
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },

    parentCategoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: false,
      index: true,
    },

    // 🔥 SEO SLUG CACHE (VERY IMPORTANT)

categorySlug: {
  type: String,
  lowercase: true,
  index: true,
},

// ================= SERVICES =================

services: [
  {
    name: {
      type: String,
      trim: true,
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },
  }
],


// ================= SERVICE TYPE =================

serviceTypes: [
  {
    type: String,
    trim: true,
  }
],


// ================= SERVICE COVERAGE =================

serviceCoverage: {

  // Coverage level
  type: {
    type:String,

    enum:[
      "city",      // selected cities
      "state",     // selected states
      "country",   // selected countries
      "global"     // worldwide
    ],

    default:"city",
  },

  // Whether selected list or full coverage
  mode: {
    type: String,
    enum: [
      "selected",
      "all"
    ],
    default: "selected",
  },

  // selected countries
  countries:[

    {
      name:{
        type:String,
        trim:true,
      },

      code:{
        type:String,
        trim:true,
      }
    }

  ],


  // selected states
  states:[

    {
      name:{
        type:String,
        trim:true,
      },

      stateCode:{
        type:String,
        trim:true,
      },

      country:{
        type:String,
        trim:true,
      },

      countryCode:{
        type:String,
        trim:true,
      }

    }

  ],


  // selected cities

  cities:[

    {

      cityId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"City",
      },


      name:{
        type:String,
        trim:true,
      },


      district: {
        type: String,
        trim: true,
      },


      state:{
        type:String,
        trim:true,
      },


      country:{
        type:String,
        trim:true,
      },


      countryCode:{
        type:String,
        trim:true,
      }

    }

  ]

},
    
// ================= INTENT TAGS =================
intentTags: [
  {
    type: String,
    lowercase: true,
    trim: true,
  }
],

    // ================= LOCATION =================
address: {
  street: {
    type: String,
    trim: true,
    default: ""
  },

  area: {
    type: String,
    trim: true,
    default: ""
  },

  landmark: {
    type: String,
    trim: true,
    default: ""
  }
},

cityId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "City",
  required: true,
  index: true,
},

// 🔥 KEEP FOR SEO + fallback (NOT primary)
cityName: {
  type: String,
  lowercase: true,
  index: true,
},

citySlug: {
  type: String,
  lowercase: true,
  index: true,
},

district: String,
state: String,
pincode: String,

country:{
 type:String,
 default:"India",
 index:true
},

countryCode:{
 type:String,
 default:"IN"
},
    

    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
  type: [Number],
  required: true,
  validate: {
    validator: function (val) {
      return Array.isArray(val) && val.length === 2;
    },
    message: "Location must have [lng, lat]",
  },
},
    },

    isDeleted: {
  type: Boolean,
  default: false,
  index: true,
},

    // ================= CONTACT =================
    phone: {
  type: String,
  required: true,
},

phoneCountryCode: {
  type: String,
  trim: true,
  default: "+91",
},

whatsapp: {
  type: String,
  trim: true,
},

whatsappCountryCode: {
  type: String,
  trim: true,
  default: "+91",
},

alternatePhone: {
  type: String,
  trim: true,
},

alternatePhoneCountryCode: {
  type: String,
  trim: true,
  default: "+91",
},

landline: {
  type: String,
  trim: true,
},

landlineCountryCode: {
  type: String,
  trim: true,
  default: "+91",
},

phoneVerified: {
  type: Boolean,
  default: false,
},

documentVerified:{
 type:Boolean,
 default:false
},

phoneVerifiedAt: Date,

email: {
  type: String,
  trim: true,
  lowercase: true,
},

website: {
  type: String,
  trim: true,
},

boost: {
  type: Boolean,
  default: false,
},

// ================= SERVICE PRICING =================

pricing: [
  {
    name: {
      type: String,
      trim: true,
      required: true,
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },

    // Regular / MRP / Original price
    originalPrice: {
      type: Number,
      min: 0,
      default: 0,
    },

    // Actual starting / offer price
    price: {
      type: Number,
      min: 0,
      default: 0,
    },

    // Pricing unit
    pricingUnit: {
      type: String,
      enum: [
        "per_visit",
        "per_service",
        "per_job",
        "per_hour",
        "per_day",
        "per_month",
        "per_piece",
        "per_item",
        "per_set",
        "per_unit",
        "per_sq_ft",
        "per_sq_meter",
        "per_kg",
        "per_km",
        "per_person",
        "per_room",
        "per_session",
        "per_consultation",
        "per_appointment",
        "per_project",
        "custom",
      ],
      default: "per_service",
    },

    // Used only when pricingUnit === "custom"
    customPricingUnit: {
      type: String,
      trim: true,
      default: "",
    },

    // Optional explicit price-on-request mode
    priceOnRequest: {
      type: Boolean,
      default: false,
    },
  },
],

catalog:[
 {
   name:String,

   description:{
     type:String,
     default:"",
   },

   price:{
     type:Number,
     default:0,
   },

   image:{
     type:String,
     default:"",
   }
 }
],

faq:[
 {
   question:String,

   answer:String,
 }
],

offers: [
  {
    title: {
      type: String,
      trim: true,
      maxlength: 150,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },

    image: {
      type: String,
      trim: true,
      default: "",
    },

    expiryDate: {
      type: Date,
    },

    // Optional structured offer data
    discountPercent: {
      type: Number,
      min: 0,
      max: 100,
    },

    // Backward compatibility / future use
    validTill: {
      type: Date,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
],

bookingSettings: {
  enabled: {
    type: Boolean,
    default: false,
  },

  type: {
    type: String,
    enum: [
      "appointment",
      "table",
      "room",
      "party",
    ],
  },
},

// ================= RESTAURANT BOOKING =================

restaurantBooking: {
  enabled: {
    type: Boolean,
    default: false,
  },

  totalTables: {
    type: Number,
    min: 0,
    default: 0,
  },

  seatingCapacity: {
    type: Number,
    min: 0,
    default: 0,
  },

  advanceBookingDays: {
    type: Number,
    min: 0,
    default: 0,
  },
},

// ================= ROOM BOOKING =================

roomBooking: {
  enabled: {
    type: Boolean,
    default: false,
  },

  totalRooms: {
    type: Number,
    min: 0,
    default: 0,
  },

  advanceBookingDays: {
    type: Number,
    min: 0,
    default: 0,
  },
},

// ================= PARTY BOOKING =================

partyBooking: {
  enabled: {
    type: Boolean,
    default: false,
  },

  capacity: {
    type: Number,
    min: 0,
    default: 0,
  },

  advanceBookingDays: {
    type: Number,
    min: 0,
    default: 0,
  },
},

// ================= FOOD =================

foodType: {
  type: String,
  trim: true,
  lowercase: true,
},

menu: {
  type: [
    {
      name: {
        type: String,
        trim: true,
      },

      description: {
        type: String,
        default: "",
      },

      price: {
        type: Number,
        default: 0,
      },

      image: {
        type: String,
        default: "",
      },

      category: {
        type: String,
        default: "",
      },

      isAvailable: {
        type: Boolean,
        default: true,
      },
    },
  ],
  default: [],
},

    // ================= SOCIAL =================
    socialLinks: {
      facebook: String,
      instagram: String,
      youtube: String,
      twitter: String,
    },

    directionClicks: {
  type:Number,
  default:0
},

shareClicks:{
  type:Number,
  default:0
},

bookingClicks:{
  type:Number,
  default:0
},

leadCount:{
  type:Number,
  default:0
},

    // ================= BUSINESS HOURS =================
    businessHours: {
  monday: { open: String, close: String, closed: { type: Boolean, default: false } },
  tuesday: { open: String, close: String, closed: { type: Boolean, default: false } },
  wednesday: { open: String, close: String, closed: { type: Boolean, default: false } },
  thursday: { open: String, close: String, closed: { type: Boolean, default: false } },
  friday: { open: String, close: String, closed: { type: Boolean, default: false } },
  saturday: { open: String, close: String, closed: { type: Boolean, default: false } },
  sunday: { open: String, close: String, closed: { type: Boolean, default: false } },
},

    // ================= REVIEWS =================
    averageRating: {
      type: Number,
      default: 0,
    },

    totalReviews: {
      type: Number,
      default: 0,
    },

    // ================= ANALYTICS =================
    views: { type: Number, default: 0 },
    phoneClicks: { type: Number, default: 0 },
    whatsappClicks: { type: Number, default: 0 },
    searchAppearances: { type: Number, default: 0 },

    // ================= SEARCH =================
    tags: [String],
    keywords: [String],

    seo: {
  title: {
    type: String,
    trim: true,
  },

  description: {
    type: String,
    trim: true,
  },

  keywords: {
    type: [String],
    default: [],
  },

  h1: {
    type: String,
    trim: true,
  },
},

    // ================= FEATURED =================
    isFeatured: { type: Boolean, default: false },
    featurePriority: { type: Number, default: 0 },
    featuredUntil: Date,

    isVerified:{
 type:Boolean,
 default:false,
 index:true,
},

verificationType:{
 type:String,
 enum:[
   "none",
   "phone",
   "document",
   "both"
 ],
 default:"none"
},

verifiedAt:Date,

plan: {
  type: String,
  enum: [
    "free",
    "trusted",
    "premium"
  ],
  default: "free",
    index:true,
},

priorityScore:{
 type:Number,
 default:10
},

    // ================= CLAIM =================
isClaimed: {
  type:Boolean,
  default:false,
},

claimStatus:{
  type:String,
  enum:[
    "none",
    "pending",
    "approved",
    "rejected"
  ],
  default:"none",
},

claimedBy:{
  type:mongoose.Schema.Types.ObjectId,
  ref:"User",
  default:null,
},

claimedAt:{
  type:Date,
},

    // ================= STATUS =================
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "suspended"],
      default: "pending",
    },

    // ================= OWNER =================
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
  },
  { timestamps: true }
);

// ================= CAPTURE ORIGINAL SLUG =================
businessSchema.pre("init", function () {
  this._originalSlug = this.slug;
});

// ================= PRE SAVE HOOK =================
businessSchema.pre("save", async function (next) {
  try {
    // ================= BASIC NORMALIZATION =================
    this.name = normalizeText(this.name);
    this.description = normalizeText(this.description);
if (this.address) {
    this.address.street = normalizeText(this.address.street);
    this.address.area = normalizeText(this.address.area);
    this.address.landmark = normalizeText(this.address.landmark);
  }

    if (this.district) this.district = normalizeText(this.district);
    if (this.state) this.state = normalizeText(this.state);

    // ================= HARD VALIDATION =================
    if (!this.cityId) {
      throw new Error("cityId is required");
    }

    // ================= LOCATION VALIDATION =================
if (
  this.location &&
  (!Array.isArray(this.location.coordinates) ||
    this.location.coordinates.length !== 2)
) {
  return next(new Error("Location must have [lng, lat]"));
}

 // ================= CITY SYNC =================
if (this.isModified("cityId")) {

  const cityDoc =
    await mongoose.models.City.findById(this.cityId);

  if (!cityDoc) {
    throw new Error("Invalid cityId: City not found");
  }

  // SEO Cache
  this.cityName = normalizeCity(cityDoc.name);
  this.citySlug = cityDoc.slug;

  // Display Data
  this.district = normalizeText(cityDoc.district);
  this.state = normalizeText(cityDoc.state);
}


// ================= CATEGORY SYNC =================
if (this.isModified("categoryId")) {

  const categoryDoc =
    await mongoose.models.Category.findById(this.categoryId);

  if (!categoryDoc) {
    throw new Error("Invalid categoryId");
  }

  this.categorySlug = categoryDoc.slug;
  this.parentCategoryId = categoryDoc.parentCategory || null;
}

    // ================= SAFETY NORMALIZATION =================
    if (this.cityName) {
      this.cityName = normalizeCity(this.cityName);
    }

// ================= PHONE =================
// Phone formatting & validation handled in controller
// Model only ensures required field through schema


    // ================= SLUG HISTORY =================
if (!this.isNew && this.isModified("slug")) {
  this.slugHistory = this.slugHistory || [];

  if (
    this._originalSlug &&
    this._originalSlug !== this.slug &&
    !this.slugHistory.includes(this._originalSlug)
  ) {
    this.slugHistory.push(this._originalSlug);
  }
}

    // ================= FEATURE EXPIRY =================
if (this.featuredUntil && this.featuredUntil < new Date()) {
  this.isFeatured = false;
  this.featurePriority = 0;
}

    next();
  } catch (err) {
    next(err);
  }
});

// =========================================================
// 🔗 SLUG HISTORY FOR findOneAndUpdate / findByIdAndUpdate
// =========================================================
//
// IMPORTANT:
// pre("save") does NOT run for findByIdAndUpdate().
//
// updateBusiness() currently uses findByIdAndUpdate(),
// therefore slug history must also be captured here.
//
// =========================================================

businessSchema.pre(
  "findOneAndUpdate",
  async function (next) {
    try {

      const update = this.getUpdate() || {};

      // ---------------------------------------------------
      // Extract new slug
      // ---------------------------------------------------

      const newSlug =
        update.slug ||
        update.$set?.slug ||
        "";

      if (!newSlug) {
        return next();
      }

      const normalizedNewSlug =
        String(newSlug)
          .trim()
          .toLowerCase();

      // ---------------------------------------------------
      // Find current business
      // ---------------------------------------------------

      const currentBusiness =
        await this.model
          .findOne(this.getQuery())
          .select("slug slugHistory")
          .lean();

      if (!currentBusiness) {
        return next();
      }

      const oldSlug =
        String(currentBusiness.slug || "")
          .trim()
          .toLowerCase();

      // ---------------------------------------------------
      // No slug change
      // ---------------------------------------------------

      if (
        !oldSlug ||
        oldSlug === normalizedNewSlug
      ) {
        return next();
      }

      // ---------------------------------------------------
      // Ensure $addToSet exists
      // ---------------------------------------------------

      update.$addToSet =
        update.$addToSet || {};

      // ---------------------------------------------------
      // Preserve old slug
      // ---------------------------------------------------

      update.$addToSet.slugHistory = oldSlug;

      // ---------------------------------------------------
      // Always normalize new slug
      // ---------------------------------------------------

      if (update.$set) {

        update.$set.slug =
          normalizedNewSlug;

      } else {

        update.slug =
          normalizedNewSlug;

      }

      this.setUpdate(update);

      next();

    } catch (error) {

      next(error);

    }
  }
);

// ================= GLOBAL QUERY FILTER =================
businessSchema.pre(/^find/, function (next) {
  const options = this.getOptions?.() || {};

  const isAdminQuery =
    options.includeAll === true ||
    this.options?.includeAll === true;

  if (!isAdminQuery) {
    this.where({
      isDeleted: { $ne: true },
    });
  }

  next();
});

// ================= INDEXES =================

// 🔍 TEXT SEARCH (for keyword search)
businessSchema.index({
  name: "text",
  description: "text",
  tags: "text",
  keywords: "text",
});

// CORE QUERY INDEX (MOST IMPORTANT)
businessSchema.index({
  cityId: 1,
  categoryId: 1,
  status: 1,
  isDeleted: 1,
});

// RANKING INDEX
businessSchema.index({
  isFeatured: -1,
  featurePriority: -1,
  featuredUntil: 1,
});

// ANALYTICS INDEX
businessSchema.index({
  averageRating: -1,
  totalReviews: -1,
  views: -1,
});

// 🚀 CATEGORY TREE SUPPORT
businessSchema.index({
  parentCategoryId: 1,
});

// ================= SEO ROUTING =================

businessSchema.index({
  citySlug: 1,
  categorySlug: 1,
  slug: 1,
});

/* =========================================================
   BUSINESS SLUG UNIQUENESS
   Same slug allowed in different cities
   Same slug NOT allowed in same city
========================================================= */

businessSchema.index(
  {
    cityId: 1,
    slug: 1,
  },
  {
    unique: true,
  }
);

businessSchema.index({
  slugHistory: 1,
});

// ================= GEO =================

businessSchema.index({
  location: "2dsphere",
});

// ================= EXPORT =================
export default mongoose.model("Business", businessSchema);