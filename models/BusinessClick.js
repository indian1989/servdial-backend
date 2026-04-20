// backend/models/BusinessClick.js
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

    cityId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "City",
  index: true,
},

ipAddress: {
  type: String,
  index: true,
},

userAgent: {
  type: String,
},

fingerprint: {
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
businessClickSchema.index({ business: 1, keyword: 1, cityId: 1 });

businessClickSchema.index(
  { business: 1, user: 1, ipAddress: 1 },
  { partialFilterExpression: { user: { $ne: null } } }
);

export default mongoose.model("BusinessClick", businessClickSchema);