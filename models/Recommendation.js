// models/Recommendation.js

import mongoose from "mongoose";

const recommendationSchema = new mongoose.Schema(
{
  business: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Business",
    required: true
  },

  score: {
    type: Number,
    default: 0
  },

  reason: {
    type: String
  }

},
{ timestamps: true }
);

export default mongoose.model("Recommendation", recommendationSchema);