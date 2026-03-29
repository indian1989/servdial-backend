import mongoose from "mongoose";

const searchTrendSchema = new mongoose.Schema(
  {
    query: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    city: {
      type: String,
      default: null,
      index: true,
    },

    category: {
      type: String,
      default: null,
      index: true,
    },

    count: {
      type: Number,
      default: 1,
    },

    lastSearchedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

/* ================= INDEX FOR FAST AGGREGATION ================= */
searchTrendSchema.index({ query: 1, city: 1, category: 1 });

export default mongoose.model("SearchTrend", searchTrendSchema);