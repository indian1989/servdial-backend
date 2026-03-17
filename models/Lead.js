// backend/models/Lead.js

import mongoose from "mongoose";

const leadSchema = new mongoose.Schema(
{
  business: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Business",
    required: true,
    index: true
  },

  name: {
    type: String,
    required: true,
    trim: true
  },

  phone: {
    type: String,
    required: true
  },

  email: {
    type: String,
    default: ""
  },

  message: {
    type: String,
    default: ""
  },

  city: {
    type: String,
    default: "",
    index: true
  },

  // Lead source tracking
  source: {
    type: String,
    enum: ["form", "phone", "whatsapp", "chat"],
    default: "form"
  },

  // Lead lifecycle
  status: {
    type: String,
    enum: ["new", "contacted", "converted", "closed"],
    default: "new",
    index: true
  }

},
{
  timestamps: true
}
);


// ================= INDEXES =================

// Faster provider dashboard queries
leadSchema.index({ business: 1, createdAt: -1 });

export default mongoose.model("Lead", leadSchema);