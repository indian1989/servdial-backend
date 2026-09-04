import mongoose from "mongoose";

/* ======================================================
   PAGE VIEW
   INDUSTRY-STANDARD PAGE VIEW MODEL

   Architecture:
   Visitor
      ↓
   Session
      ↓
   Page Views
      ↓
   Events

   IMPORTANT:
   - One PageView = one tracked page view.
   - Page views belong to a Visitor + Session.
   - IP is NOT used as visitor identity.
   - Logged-in user/provider can be associated.
   - Existing BusinessView analytics remain separate.
====================================================== */

const pageViewSchema = new mongoose.Schema(
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

    path: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },

    pageTitle: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
    },

    pageType: {
      type: String,
      enum: [
        "home",
        "search",
        "business",
        "category",
        "city",
        "listing",
        "auth",
        "admin",
        "other",
      ],
      default: "other",
      index: true,
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

    referrer: {
      type: String,
      default: "",
      trim: true,
      maxlength: 2000,
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

    durationSeconds: {
      type: Number,
      default: 0,
      min: 0,
    },

    viewedAt: {
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

pageViewSchema.index({
  visitorId: 1,
  viewedAt: -1,
});

pageViewSchema.index({
  sessionId: 1,
  viewedAt: -1,
});

pageViewSchema.index({
  visitorType: 1,
  viewedAt: -1,
});

pageViewSchema.index({
  user: 1,
  viewedAt: -1,
});

pageViewSchema.index({
  pageType: 1,
  viewedAt: -1,
});

pageViewSchema.index({
  business: 1,
  viewedAt: -1,
});

pageViewSchema.index({
  category: 1,
  viewedAt: -1,
});

pageViewSchema.index({
  city: 1,
  viewedAt: -1,
});

pageViewSchema.index({
  source: 1,
  viewedAt: -1,
});

/* ======================================================
   MODEL
====================================================== */

const PageView = mongoose.model(
  "PageView",
  pageViewSchema
);

export default PageView;