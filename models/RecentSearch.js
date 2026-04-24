import mongoose from "mongoose";

const recentSearchSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    query: {
      type: String,
      required: true,
      trim: true,
    },

    // ✅ STRICT ALIGNMENT WITH BUSINESS MODEL
    cityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "City",
      default: null,
      index: true,
    },

    citySlug: {
      type: String,
      lowercase: true,
      trim: true,
      index: true,
    },

    cityName: {
      type: String,
      trim: true,
    },

    category: {
      type: String,
      default: null,
    },

    lastSearchedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

/* ================= UNIQUE PER USER ================= */
recentSearchSchema.index({ user: 1, query: 1 });

export default mongoose.model("RecentSearch", recentSearchSchema);