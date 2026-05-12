import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    // ================= RELATIONS =================
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
      index: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    // ================= REVIEW DATA =================
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },

    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      index: true,
    },

    comment: {
      type: String,
      default: "",
      trim: true,
      maxlength: 2000,
    },

    // ================= ANTI-SPAM =================
    ipAddress: {
      type: String,
      index: true,
    },

    userAgent: {
      type: String,
      default: "",
    },

    fingerprint: {
      type: String,
      index: true,
    },

    createdDay: {
      type: String,
      index: true,
    },

    // ================= MODERATION =================
    isApproved: {
      type: Boolean,
      default: true,
      index: true,
    },

    isVerified: {
      type: Boolean,
      default: false,
      index: true,
    },

    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },

    // ================= COMMUNITY SIGNALS =================
    helpfulCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

// ======================================================
// AUTO DAY PARTITION
// ======================================================
reviewSchema.pre("save", function (next) {
  if (!this.createdDay) {
    this.createdDay = new Date().toISOString().split("T")[0];
  }

  next();
});

// ======================================================
// INDEXES
// ======================================================

// Fast business review loading
reviewSchema.index({
  businessId: 1,
  createdAt: -1,
});

// Prevent duplicate review from same logged-in user
reviewSchema.index(
  {
    businessId: 1,
    userId: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      userId: { $exists: true, $ne: null },
    },
  }
);

// Fingerprint anti-spam
reviewSchema.index({
  businessId: 1,
  fingerprint: 1,
});

// Moderation queries
reviewSchema.index({
  businessId: 1,
  isApproved: 1,
  isDeleted: 1,
});

// Rating analytics
reviewSchema.index({
  businessId: 1,
  rating: 1,
});

export default mongoose.model("Review", reviewSchema);