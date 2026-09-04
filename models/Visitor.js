import mongoose from "mongoose";

/* ======================================================
   VISITOR
   INDUSTRY-STANDARD VISITOR IDENTITY MODEL

   Architecture:
   Visitor
      ↓
   Session
      ↓
   Page Views
      ↓
   Events

   IMPORTANT:
   - IP is NOT visitor identity.
   - Guest visitor uses anonymous visitorId.
   - Logged-in user/provider can be associated with account.
====================================================== */

const visitorSchema = new mongoose.Schema(
  {
    /* ====================================================
       ANONYMOUS VISITOR IDENTITY
    ==================================================== */

    visitorId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },

    /* ====================================================
       VISITOR TYPE
    ==================================================== */

    visitorType: {
      type: String,
      enum: [
        "guest",
        "user",
        "provider",
      ],
      default: "guest",
      required: true,
      index: true,
    },

    /* ====================================================
       AUTHENTICATED IDENTITY
    ==================================================== */

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    /* ====================================================
       FIRST / LAST ACTIVITY
    ==================================================== */

    firstSeenAt: {
      type: Date,
      default: Date.now,
      index: true,
    },

    lastSeenAt: {
      type: Date,
      default: Date.now,
      index: true,
    },

    /* ====================================================
       BASIC DEVICE / CLIENT INFORMATION
       Useful for analytics, not identity.
    ==================================================== */

    userAgent: {
      type: String,
      default: "",
      trim: true,
    },

    deviceType: {
      type: String,
      enum: [
        "desktop",
        "mobile",
        "tablet",
        "unknown",
      ],
      default: "unknown",
      index: true,
    },

    browser: {
      type: String,
      default: "",
      trim: true,
    },

    operatingSystem: {
      type: String,
      default: "",
      trim: true,
    },

    /* ====================================================
       LOCATION CONTEXT
       Optional / approximate analytics context only.
    ==================================================== */

    country: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },

    state: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },

    city: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },

    /* ====================================================
       TRAFFIC SOURCE
    ==================================================== */

    source: {
      type: String,
      enum: [
        "direct",
        "organic",
        "social",
        "referral",
        "campaign",
        "unknown",
      ],
      default: "unknown",
      index: true,
    },

    /* ====================================================
       REFERRER
    ==================================================== */

    referrer: {
      type: String,
      default: "",
      trim: true,
    },

    /* ====================================================
       CAMPAIGN ATTRIBUTES
       Future-ready for UTM analytics.
    ==================================================== */

    utmSource: {
      type: String,
      default: "",
      trim: true,
    },

    utmMedium: {
      type: String,
      default: "",
      trim: true,
    },

    utmCampaign: {
      type: String,
      default: "",
      trim: true,
    },

    utmTerm: {
      type: String,
      default: "",
      trim: true,
    },

    utmContent: {
      type: String,
      default: "",
      trim: true,
    },

    /* ====================================================
       STATUS
    ==================================================== */

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

/* ======================================================
   COMPOUND INDEXES
====================================================== */

visitorSchema.index({
  visitorType: 1,
  lastSeenAt: -1,
});

visitorSchema.index({
  user: 1,
  lastSeenAt: -1,
});

visitorSchema.index({
  city: 1,
  visitorType: 1,
  lastSeenAt: -1,
});

visitorSchema.index({
  source: 1,
  lastSeenAt: -1,
});

/* ======================================================
   MODEL
====================================================== */

const Visitor = mongoose.model(
  "Visitor",
  visitorSchema
);

export default Visitor;