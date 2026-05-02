import mongoose from "mongoose";

const slugHistorySchema = new mongoose.Schema(
  {
    slug: { type: String, required: true },
    changedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const citySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    slugHistory: [slugHistorySchema],

    state: String,
    district: String,

    location: {
      type: {
        type: String,
        enum: ["Point"],
      },
      coordinates: {
        type: [Number], // [lng, lat]
      },
    },

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { timestamps: true }
);


// 🔥 INDEXES
citySchema.index({ slug: 1 }, { unique: true });
citySchema.index({ "slugHistory.slug": 1 });

export default mongoose.model("City", citySchema);