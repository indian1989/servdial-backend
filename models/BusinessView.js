// models/BusinessView.js

import mongoose from "mongoose";

const businessViewSchema = new mongoose.Schema(
{
  business: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Business",
    required: true,
    index: true
  },

  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null
  },

  ipAddress: {
    type: String
  },

  userAgent: {
    type: String
  },

  viewedAt: {
    type: Date,
    default: Date.now
  }

},
{ timestamps: true }
);

export default mongoose.model("BusinessView", businessViewSchema);