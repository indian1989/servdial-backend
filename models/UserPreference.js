import mongoose from "mongoose";

const userPreferenceSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },

    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      index: true,
    },

    score: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

userPreferenceSchema.index({ user: 1, categoryId: 1 });

export default mongoose.model("UserPreference", userPreferenceSchema);