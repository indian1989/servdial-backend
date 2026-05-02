import mongoose from "mongoose";

const businessSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },

    slug: { type: String, required: true, unique: true },

    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },

    categorySlug: String,

    cityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "City",
      required: true,
    },

    citySlug: String,

    district: String,
    state: String,

    address: String,

    phone: { type: String, required: true },
    whatsapp: String,
    website: String,
    description: String,

    location: {
      type: {
        type: String,
        enum: ["Point"],
        required: true,
      },
      coordinates: {
        type: [Number],
        required: true,
      },
    },

    logo: String,
    images: [String],
    businessHours: Object,

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "approved",
    },

    role: {
      type: String,
      enum: ["admin", "provider"],
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

// 🔥 GEO INDEX (CRITICAL)
businessSchema.index({ location: "2dsphere" });

export default mongoose.model("Business", businessSchema);