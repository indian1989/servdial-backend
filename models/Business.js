import mongoose from "mongoose";
import slugify from "../utils/slugify.js";


const businessSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    slug: {
      type: String,
      unique: true,
      index: true,
    },

    category: {
      type: String,
      required: true,
      index: true,
    },

    address: {
      type: String,
      trim: true,
    },

    city: {
      type: String,
      required: true,
      index: true,
    },

    district: {
      type: String,
      required: true,
      index: true,
    },

    state: {
      type: String,
      required: true,
      index: true,
    },

    phone: {
      type: String,
      required: true,
      unique: true,
    },

    description: {
      type: String,
      trim: true,
    },

    images: [String],

    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], // [longitude, latitude] → Leaflet compatible
        default: [0, 0],
      },
    },

    averageRating: {
      type: Number,
      default: 0,
    },

    totalReviews: {
      type: Number,
      default: 0,
    },

    // Featured system fields

isFeatured: {
  type: Boolean,
  default: false
},

featureRequest: {
  type: Boolean,
  default: false
},

featureStatus: {
  type: String,
  enum: ["none", "pending", "approved", "rejected"],
  default: "none"
},

    featuredUntill: {
      type: Date
    },

    // Future Paid Service Flags
    paidServices: {
      gstRegistered: { type: Boolean, default: false },
      premiumListing: { type: Boolean, default: false },
      verifiedBadge: { type: Boolean, default: false },
    },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// ================= Slug Auto-generate =================
businessSchema.pre("save", function (next) {
  if (!this.slug && this.name) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }
  next();
});

// ================= GET ALL BUSINESSES =================
export const getAllBusinesses = async (req, res) => {
  try {
    const businesses = await Business.find()
      .populate("owner", "name email")
      .sort({ createdAt: -1 });

    res.json(businesses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ================= APPROVE BUSINESS =================
export const approveBusiness = async (req, res) => {
  try {
    const business = await Business.findByIdAndUpdate(
      req.params.id,
      { status: "approved" },
      { new: true }
    );

    res.json(business);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ================= REJECT BUSINESS =================
export const rejectBusiness = async (req, res) => {
  try {
    const business = await Business.findByIdAndUpdate(
      req.params.id,
      { status: "rejected" },
      { new: true }
    );

    res.json(business);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ================= DELETE BUSINESS =================
export const deleteBusiness = async (req, res) => {
  try {
    await Business.findByIdAndDelete(req.params.id);
    res.json({ message: "Business deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ================= FEATURE BUSINESS =================
export const toggleFeatured = async (req, res) => {
  try {
    const business = await Business.findById(req.params.id);

    business.isFeatured = !business.isFeatured;
    await business.save();

    res.json(business);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ================= Indexes =================

// Text search for business search
businessSchema.index({
  name: "text",
  description: "text",
  category: "text",
  city: "text",
});

// Geo location search
businessSchema.index({ location: "2dsphere" });

// Fast filter by city + category
businessSchema.index({ city: 1, category: 1 });



export default mongoose.model("Business", businessSchema);