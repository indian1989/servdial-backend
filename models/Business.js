// backend/models/Business.js

import mongoose from "mongoose";
import slugify from "../utils/slugify.js";

const businessSchema = new mongoose.Schema(
{
  // ================= BASIC INFO =================

  name: {
    type: String,
    required: true,
    trim: true
  },

  slug: {
    type: String,
    unique: true,
    index: true
  },

  description: {
    type: String,
    trim: true
  },

  logo: String,

  images: [String],


  // ================= CATEGORY =================

  category: {
    type: String,
    required: true,
    index: true
  },

  subCategory: {
    type: String,
    index: true
  },

  services: [String],


  // ================= LOCATION =================

  address: String,

  city: {
    type: String,
    required: true,
    index: true
  },

  district: {
    type: String,
    required: true,
    index: true
  },

  state: {
    type: String,
    required: true,
    index: true
  },

  pincode: String,


  location: {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point"
    },
   coordinates: {
  type: [Number],
  validate: {
    validator: function(val){
      return val.length === 2
    },
    message: "Coordinates must be [longitude, latitude]"
  },
  default: [0,0]
}
  },


  // ================= CONTACT =================

  phone: {
    type: String,
    required: true,
    unique: true
  },

  whatsapp: String,

  email: String,

  website: String,


  // ================= SOCIAL =================

  socialLinks: {
    facebook: String,
    instagram: String,
    youtube: String,
    twitter: String
  },


  // ================= BUSINESS HOURS =================

  businessHours: {
    monday: { open: String, close: String },
    tuesday: { open: String, close: String },
    wednesday: { open: String, close: String },
    thursday: { open: String, close: String },
    friday: { open: String, close: String },
    saturday: { open: String, close: String },
    sunday: { open: String, close: String }
  },


  // ================= REVIEWS =================

  averageRating: {
    type: Number,
    default: 0
  },

  totalReviews: {
    type: Number,
    default: 0
  },


  // ================= ANALYTICS =================

  views: {
    type: Number,
    default: 0
  },

  phoneClicks: {
    type: Number,
    default: 0
  },

  whatsappClicks: {
    type: Number,
    default: 0
  },

  searchAppearances: {
    type: Number,
    default: 0
  },


  // ================= SEARCH / SEO =================

  tags: [String],

  keywords: [String],


  // ================= FEATURED / RANKING =================

  isFeatured: {
    type: Boolean,
    default: false
  },

  featurePriority: {
    type: Number,
    default: 0
  },

  featureRequest: {
    type: Boolean,
    default: false
  },

  featureStatus: {
    type: String,
    enum: ["none","pending","approved","rejected"],
    default: "none"
  },

  featuredUntil: {
    type: Date
  },

  isVerified: {
  type: Boolean,
  default: false
},

isClaimed: {
  type: Boolean,
  default: false
},

  // ================= PAID SERVICES =================

  paidServices: {
    gstRegistered: { type: Boolean, default: false },
    premiumListing: { type: Boolean, default: false },
    verifiedBadge: { type: Boolean, default: false }
  },

  // ================= BUSINESS STATUS =================

  status: {
    type: String,
    enum: ["pending","approved","rejected","suspended"],
    default: "pending"
  },


  // ================= OWNER =================

  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  }

},
{
  timestamps: true
}
)


// ================= AUTO SLUG =================

businessSchema.pre("save", async function(next){

  if(!this.slug && this.name){
    let baseSlug = slugify(this.name)
    let slug = baseSlug
    let counter = 1

    while(await mongoose.models.Business.findOne({ slug })){
      slug = `${baseSlug}-${counter++}`
    }

    this.slug = slug
  }

  next()
})

// ================= INDEXES =================

businessSchema.index({
  name: "text",
  description: "text",
  category: "text",
  city: "text",
  tags: "text",
  services: "text"
})

businessSchema.index({ location: "2dsphere" })

businessSchema.index({ city: 1, category: 1, isFeatured: -1, averageRating: -1 })

export default mongoose.model("Business", businessSchema);