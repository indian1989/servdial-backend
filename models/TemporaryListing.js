import mongoose from "mongoose";

const TemporaryListingSchema = new mongoose.Schema(
  {
    /* ======================================================
       LISTING TYPE
       Always fixed — cannot be changed from frontend
    ====================================================== */

    listingType: {
      type: String,
      default: "Temporary Listing",
      immutable: true,
      index: true,
    },

    /* ======================================================
       BASIC INFORMATION
    ====================================================== */

    title: {
      type: String,
      required: true,
      trim: true,
    },

    category: {
      type: String,
      trim: true,
      default: "",
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },

    price: {
      type: Number,
      default: null,
    },

    /* ======================================================
       LOCATION
    ====================================================== */

    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: undefined,
      },

      coordinates: {
        type: [Number],
        default: undefined,
      },
    },

    city: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },

    state: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },

    pincode: {
      type: String,
      trim: true,
      default: "",
    },

    /* ======================================================
       CONTACT
    ====================================================== */

    phone: {
      type: String,
      trim: true,
      default: "",
    },

    landline: {
      type: String,
      trim: true,
      default: "",
    },

    whatsapp: {
      type: String,
      trim: true,
      default: "",
    },

    /* ======================================================
       IMAGES
    ====================================================== */

    images: {
      type: [String],
      default: [],
    },

    /* ======================================================
       EXTRA / TEMPORARY DATA
    ====================================================== */

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    /* ======================================================
       EXPIRY
    ====================================================== */

    expiryDate: {
      type: Date,
      required: true,
      index: true,
    },

    /* ======================================================
       STATUS

       pending  → provider submitted
       approved → admin approved / admin created
       rejected → admin rejected
       expired  → expiry service
    ====================================================== */

    status: {
      type: String,
      enum: [
        "pending",
        "approved",
        "rejected",
        "expired",
      ],
      default: "pending",
      index: true,
    },

    /* ======================================================
       OWNER
       
       Provider-created listing:
       → provider ObjectId

       Admin-created listing:
       → null
    ====================================================== */

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },

  {
    timestamps: true,
  }
);


/* ======================================================
   GEO INDEX
====================================================== */

TemporaryListingSchema.index({
  location: "2dsphere",
});


/* ======================================================
   PUBLIC ACTIVE LISTING INDEX
====================================================== */

TemporaryListingSchema.index({
  status: 1,
  expiryDate: 1,
  city: 1,
});


export default mongoose.model(
  "TemporaryListing",
  TemporaryListingSchema
);