// backend/models/Lead.js

import mongoose from "mongoose";

const leadSchema = new mongoose.Schema(
  {
    // ================================
    // BUSINESS
    // ================================
    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
      index: true,
    },

    // ================================
    // CUSTOMER
    // ================================
    // Registered user hone par User ObjectId.
    // Guest enquiry mein null.
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    // ==========================================
    // CUSTOMER PHONE
    // ==========================================
    // Full international number.
    //
    // Examples:
    // +916200152506
    // +447911123456
    // +14155552671
    //
    // IMPORTANT:
    // Controller/API ko ideally E.164 format mein
    // number save karna chahiye.
    phone: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    // Optional country code.
    //
    // Examples:
    // +91
    // +44
    // +1
    //
    // Phone ke andar country code already hone ke
    // bawajood ye field future filtering/analytics
    // ke liye useful hai.
    countryCode: {
      type: String,
      default: "",
      trim: true,
    },

    email: {
      type: String,
      default: "",
      trim: true,
      lowercase: true,
    },

    message: {
      type: String,
      default: "",
      trim: true,
    },

    // ================================
    // LEAD TYPE
    // ================================
    bookingType: {
      type: String,
      enum: [
        "enquiry",
        "table_booking",
        "room_booking",
        "service_booking",
        "appointment",
        "party_booking",
      ],
      default: "enquiry",
      index: true,
    },

    // ================================
    // SOURCE
    // ================================
    source: {
      type: String,
      enum: [
        "form",
        "phone",
        "whatsapp",
        "chat",
        "admin",
        "provider",
      ],
      default: "form",
      index: true,
    },

    // ================================
    // BOOKING
    // ================================
    bookingDate: {
      type: String,
      default: "",
    },

    bookingTime: {
      type: String,
      default: "",
    },

    guests: {
      type: Number,
      default: null,
      min: 0,
    },

    service: {
      type: String,
      default: "",
      trim: true,
    },

    budget: {
      type: Number,
      default: null,
      min: 0,
    },

    // ================================
    // LOCATION SNAPSHOT
    // ================================
    cityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "City",
      default: null,
      index: true,
    },

    cityName: {
      type: String,
      default: "",
      trim: true,
    },

    state: {
      type: String,
      trim: true,
      default: "",
    },

    country: {
      type: String,
      trim: true,
      default: "",
    },

    // ================================
    // LEAD STATUS
    // ================================
    status: {
      type: String,
      enum: [
        "new",
        "contacted",
        "follow_up",
        "converted",
        "closed",
        "cancelled",
      ],
      default: "new",
      index: true,
    },

    // ================================
    // PROVIDER NOTES
    // ================================
    // Provider customer ke baare mein
    // internal remarks/notes.
    //
    // Ye customer ko directly visible nahi honge.
    notes: {
      type: String,
      default: "",
      trim: true,
    },

    // ================================
    // LEAD ACTIVITY TRACKING
    // ================================

    // Last time provider/customer contact hua.
    lastContactedAt: {
      type: Date,
      default: null,
    },

    // Lead successfully closed hone ka time.
    closedAt: {
      type: Date,
      default: null,
    },

    // Lead cancel hone ka time.
    cancelledAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// ============================================
// PHONE NORMALIZATION
// ============================================
//
// IMPORTANT:
// Phone ka country code controller se aana chahiye.
//
// Model sirf formatting-level cleanup karega.
// Hum yahan +91 automatically add nahi karenge,
// kyunki system worldwide hona hai.
//
// Examples:
//
// "+91 62001 52506" -> "+916200152506"
// "+44 7911 123456" -> "+447911123456"
// "+1 (415) 555-2671" -> "+14155552671"
//
// Agar phone mein "+" nahi hai, model country
// guess nahi karega.
//
// ============================================

leadSchema.pre("save", function (next) {
  if (this.phone) {
    const rawPhone = String(this.phone).trim();

    // Keep leading + and remove spaces,
    // brackets, hyphens etc.
    if (rawPhone.startsWith("+")) {
      this.phone =
        "+" + rawPhone.slice(1).replace(/\D/g, "");
    } else {
      // Backward compatibility:
      // Existing old Indian leads such as
      // "6200152506" ko unnecessarily +91
      // assume nahi karenge.
      this.phone = rawPhone.replace(/\D/g, "");
    }
  }

  // Country code bhi clean rakhein.
  if (this.countryCode) {
    const rawCountryCode =
      String(this.countryCode).trim();

    if (rawCountryCode.startsWith("+")) {
      this.countryCode =
        "+" + rawCountryCode.slice(1).replace(/\D/g, "");
    } else {
      this.countryCode =
        "+" + rawCountryCode.replace(/\D/g, "");
    }
  }

  next();
});

// ============================================
// INDEXES
// ============================================

// Business ke latest leads.
leadSchema.index({
  business: 1,
  createdAt: -1,
});

// Business + status filtering.
leadSchema.index({
  business: 1,
  status: 1,
  createdAt: -1,
});

// Registered customer's leads.
leadSchema.index({
  userId: 1,
  business: 1,
});

// Lead status dashboard queries.
leadSchema.index({
  business: 1,
  status: 1,
});

// Phone based lookup / analytics.
leadSchema.index({
  phone: 1,
  createdAt: -1,
});

export default mongoose.model("Lead", leadSchema);