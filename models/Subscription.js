// models/Subscription.js

import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema(
{
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  planName: {
    type: String,
    required: true
  },

  price: {
    type: Number,
    required: true
  },

  durationDays: {
    type: Number,
    required: true
  },

  startDate: {
    type: Date,
    default: Date.now
  },

  endDate: {
    type: Date,
    required: true
  },

  status: {
    type: String,
    enum: ["active","expired","cancelled"],
    default: "active"
  },

  paymentId: {
    type: String
  }

},
{ timestamps: true }
);

export default mongoose.model("Subscription", subscriptionSchema);