import mongoose from "mongoose";
import slugify from "slugify";

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

    isFeatured: {
      type: Boolean,
      default: false,
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

// ================= Indexes =================
// For fast search & filtering
businessSchema.index({ name: "text", description: "text", city: 1, category: 1 });
businessSchema.index({ location: "2dsphere" });

export default mongoose.model("Business", businessSchema);