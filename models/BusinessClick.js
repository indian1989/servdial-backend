import mongoose from "mongoose";

const businessClickSchema = new mongoose.Schema(
  {
    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      index: true,
      required: true,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    keyword: {
      type: String,
      index: true,
    },

    city: {
      type: String,
      index: true,
    },

    clickedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// ⚡ Index for fast ranking
businessClickSchema.index({ business: 1, keyword: 1, city: 1 });

export default mongoose.model("BusinessClick", businessClickSchema);