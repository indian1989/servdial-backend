// backend/models/Payment.js

import mongoose from "mongoose";

/*
 * =========================================================
 * PAYMENT MODEL
 * =========================================================
 *
 * Central payment model for all paid ServDial services.
 *
 * Current services:
 * - banner
 *
 * Future services:
 * - lead
 * - featured_business
 * - premium_listing
 * - subscription
 * - promotion
 * - boost
 *
 * Payment proof may be stored temporarily on Cloudinary.
 * The proof itself can be deleted later while the payment
 * record, transaction information, verification history and
 * receipt remain available for audit.
 */

const paymentSchema = new mongoose.Schema(
  {
    // =====================================================
    // PAYER
    // =====================================================

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    payerRole: {
      type: String,
      enum: ["user", "provider"],
      required: true,
      index: true,
    },

    // =====================================================
    // SERVICE
    // =====================================================

    serviceType: {
      type: String,
      enum: [
        "banner",
        "lead",
        "featured_business",
        "premium_listing",
        "subscription",
        "promotion",
        "boost",
      ],
      required: true,
      index: true,
    },

    // ID of the document/service being paid for.
    //
    // Example:
    // Banner payment   → Banner._id
    // Lead payment     → Lead._id
    //
    // Kept as ObjectId without a fixed ref because
    // serviceType can point to different collections.

    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    // =====================================================
    // PAYMENT IDENTIFICATION
    // =====================================================

    paymentNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    transactionId: {
  type: String,
  trim: true,
  index: true,
},

    // =====================================================
    // AMOUNT
    // =====================================================

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    currency: {
      type: String,
      default: "INR",
      trim: true,
      uppercase: true,
    },

    // =====================================================
    // PAYMENT METHOD
    // =====================================================

    paymentMethod: {
      type: String,
      enum: [
        "upi",
        "bank_transfer",
      ],
      required: true,
      index: true,
    },

    // =====================================================
    // PAYMENT DESTINATION SNAPSHOT
    // =====================================================
    //
    // These values represent the ServDial payment
    // destination used at the time of payment.
    //
    // We keep a snapshot so that if payment settings
    // change later, the historical payment record still
    // shows where the customer was instructed to pay.
    //
    // Sensitive information is minimized.

    paymentAccountName: {
      type: String,
      trim: true,
    },

    paymentUpiId: {
      type: String,
      trim: true,
    },

    paymentBankName: {
      type: String,
      trim: true,
    },

    paymentBankAccountLast4: {
      type: String,
      trim: true,
      maxlength: 4,
    },

    paymentBankIfsc: {
      type: String,
      trim: true,
      uppercase: true,
    },

    // =====================================================
    // PAYMENT DATE
    // =====================================================

    paymentDate: {
      type: Date,
      default: Date.now,
      required: true,
      index: true,
    },

    // =====================================================
    // PAYMENT PROOF
    // =====================================================

    proofImage: {
      type: String,
      trim: true,
    },

    proofPublicId: {
      type: String,
      trim: true,
    },

    proofUploadedAt: {
      type: Date,
    },

    // Configurable retention period.
    //
    // Example:
    // 180 = keep proof for 180 days after verification.

    proofRetentionDays: {
      type: Number,
      default: 180,
      min: 0,
    },

    proofDeleteAfter: {
      type: Date,
      index: true,
    },

    proofDeletedAt: {
      type: Date,
    },

    // =====================================================
    // PAYMENT STATUS
    // =====================================================

    status: {
      type: String,
      enum: [
        "pending",
        "processing",
        "verified",
        "rejected",
        "refunded",
        "cancelled",
      ],
      default: "pending",
      index: true,
    },

    // =====================================================
    // ADMIN VERIFICATION
    // =====================================================

    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },

    verifiedAt: {
      type: Date,
    },

    rejectionReason: {
      type: String,
      trim: true,
    },

    // =====================================================
    // RECEIPT
    // =====================================================

    receiptNumber: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
      index: true,
    },

    receiptGeneratedAt: {
      type: Date,
    },

    // =====================================================
    // REFUND
    // =====================================================

    refundedAt: {
      type: Date,
    },

    refundReference: {
      type: String,
      trim: true,
    },

    // =====================================================
    // AUDIT
    // =====================================================

    // Useful for keeping a clear payment lifecycle.

    submittedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },

    processedAt: {
      type: Date,
    },

    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// =========================================================
// INDEXES
// =========================================================

// Service-wise payment lookup
paymentSchema.index({
  serviceType: 1,
  serviceId: 1,
  status: 1,
});

// User/provider payment history
paymentSchema.index({
  userId: 1,
  createdAt: -1,
});

// Payment verification queue
paymentSchema.index({
  status: 1,
  createdAt: -1,
});

// Proof cleanup job
paymentSchema.index({
  status: 1,
  proofDeleteAfter: 1,
});

// Transaction lookup
paymentSchema.index({
  transactionId: 1,
  paymentMethod: 1,
});

// Service + payer lookup
paymentSchema.index({
  userId: 1,
  serviceType: 1,
  serviceId: 1,
});

export default mongoose.model("Payment", paymentSchema);