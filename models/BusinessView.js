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

  fingerprint: {
  type: String,
  index: true
},

  viewedAt: {
    type: Date,
    default: Date.now
  }

},
{ timestamps: true }
);

businessViewSchema.index({ business: 1, user: 1 });
businessViewSchema.index({ business: 1, ipAddress: 1 });
businessViewSchema.index({ business: 1, fingerprint: 1 });
businessViewSchema.index({ createdAt: -1 });
businessViewSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 60 * 60 * 24 * 30 } // 30 days
);

export default mongoose.model("BusinessView", businessViewSchema);