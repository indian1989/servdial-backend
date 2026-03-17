// models/Offer.js

import mongoose from "mongoose";

const offerSchema = new mongoose.Schema(
{
  business: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Business",
    required: true
  },

  title: {
    type: String,
    required: true
  },

  description: {
    type: String
  },

  discountPercent: {
    type: Number
  },

  validTill: {
    type: Date
  },

  isActive: {
    type: Boolean,
    default: true
  }

},
{ timestamps: true }
);

export default mongoose.model("Offer", offerSchema);