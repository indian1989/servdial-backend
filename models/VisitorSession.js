import mongoose from "mongoose";

/* ======================================================
   VISITOR SESSION
   INDUSTRY-STANDARD SESSION MODEL

   Architecture:
   Visitor
      ↓
   Session
      ↓
   Page Views
      ↓
   Events

   IMPORTANT:
   - One visitor can have multiple sessions.
   - visitorId identifies the Visitor document.
   - IP is NOT used as visitor identity.
   - Authenticated user/provider can be associated.
   - Session is the unit used for "Visits / Sessions".
====================================================== */

const visitorSessionSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },

    visitorId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },

    visitor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Visitor",
      default: null,
      index: true,
    },

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

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    startedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },

    lastActivityAt: {
      type: Date,
      default: Date.now,
      index: true,
    },

    endedAt: {
      type: Date,
      default: null,
      index: true,
    },

    durationSeconds: {
      type: Number,
      default: 0,
      min: 0,
    },

    pageViews: {
      type: Number,
      default: 0,
      min: 0,
    },

    events: {
      type: Number,
      default: 0,
      min: 0,
    },

    entryPage: {
      type: String,
      default: "",
      trim: true,
    },

    exitPage: {
      type: String,
      default: "",
      trim: true,
    },

    landingPage: {
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

    referrer: {
      type: String,
      default: "",
      trim: true,
    },

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
   INDEXES
====================================================== */

visitorSessionSchema.index({
  visitorId: 1,
  startedAt: -1,
});

visitorSessionSchema.index({
  visitorType: 1,
  startedAt: -1,
});

visitorSessionSchema.index({
  user: 1,
  startedAt: -1,
});

visitorSessionSchema.index({
  visitor: 1,
  startedAt: -1,
});

visitorSessionSchema.index({
  city: 1,
  visitorType: 1,
  startedAt: -1,
});

visitorSessionSchema.index({
  source: 1,
  startedAt: -1,
});

visitorSessionSchema.index({
  isActive: 1,
  lastActivityAt: -1,
});

/* ======================================================
   MODEL
====================================================== */

const VisitorSession = mongoose.model(
  "VisitorSession",
  visitorSessionSchema
);

export default VisitorSession;