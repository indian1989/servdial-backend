import mongoose from "mongoose";

/* ======================================================
   VISITOR EVENT
   INDUSTRY-STANDARD EVENT TRACKING MODEL

   Architecture:
   Visitor
      ↓
   Session
      ↓
   Page Views
      ↓
   Events

   IMPORTANT:
   - Events represent visitor interactions.
   - One event belongs to a Visitor + Session.
   - IP is NOT used as visitor identity.
   - Logged-in user/provider can be associated.
   - BusinessView / BusinessClick remain separate
     business-specific analytics systems.
====================================================== */

const visitorEventSchema = new mongoose.Schema(
  {
    visitorId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },

    sessionId: {
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

    session: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "VisitorSession",
      default: null,
      index: true,
    },

    pageView: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PageView",
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

    event: {
      type: String,
      enum: [
        "business_view",
        "search",
        "call",
        "whatsapp",
        "directions",
        "website_click",
        "category_view",
        "city_view",
        "share",
        "login",
        "register",
        "logout",
        "business_click",
        "listing_click",
        "filter",
        "favorite",
        "other",
      ],
      required: true,
      index: true,
    },

    eventLabel: {
      type: String,
      default: "",
      trim: true,
      maxlength: 200,
    },

    path: {
      type: String,
      default: "",
      trim: true,
      maxlength: 2000,
    },

    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      default: null,
      index: true,
    },

    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
      index: true,
    },

    city: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "City",
      default: null,
      index: true,
    },

    query: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
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

    cityName: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },

    occurredAt: {
      type: Date,
      default: Date.now,
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

visitorEventSchema.index({
  visitorId: 1,
  occurredAt: -1,
});

visitorEventSchema.index({
  sessionId: 1,
  occurredAt: -1,
});

visitorEventSchema.index({
  visitorType: 1,
  occurredAt: -1,
});

visitorEventSchema.index({
  user: 1,
  occurredAt: -1,
});

visitorEventSchema.index({
  event: 1,
  occurredAt: -1,
});

visitorEventSchema.index({
  business: 1,
  event: 1,
  occurredAt: -1,
});

visitorEventSchema.index({
  category: 1,
  event: 1,
  occurredAt: -1,
});

visitorEventSchema.index({
  city: 1,
  event: 1,
  occurredAt: -1,
});

visitorEventSchema.index({
  source: 1,
  occurredAt: -1,
});

/* ======================================================
   MODEL
====================================================== */

const VisitorEvent = mongoose.model(
  "VisitorEvent",
  visitorEventSchema
);

export default VisitorEvent;