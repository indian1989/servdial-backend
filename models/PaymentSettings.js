// backend/models/PaymentSettings.js

import mongoose from "mongoose";

const paymentSettingsSchema = new mongoose.Schema(
  {
    // =========================
    // SYSTEM STATUS
    // =========================

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    // =========================
    // PAYMENT METHODS
    // =========================

    upi: {
      enabled: {
        type: Boolean,
        default: true,
      },

      upiId: {
        type: String,
        trim: true,
      },

      accountName: {
        type: String,
        trim: true,
      },
    },

    bank: {
      enabled: {
        type: Boolean,
        default: false,
      },

      accountName: {
        type: String,
        trim: true,
      },

      accountNumber: {
        type: String,
        trim: true,
      },

      ifsc: {
        type: String,
        trim: true,
        uppercase: true,
      },

      bankName: {
        type: String,
        trim: true,
      },

      branchName: {
        type: String,
        trim: true,
      },
    },

    // =========================
    // PAYMENT INSTRUCTIONS
    // =========================

    instructions: {
      type: String,
      trim: true,
      default:
        "Please make the payment using the available payment method and upload the payment proof.",
    },

    // =========================
    // RECEIPT / PAYMENT PROOF
    // =========================

    receiptRequired: {
      type: Boolean,
      default: true,
    },

    // =========================
    // ADMIN AUDIT
    // =========================

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);


// =========================
// INDEXES
// =========================

paymentSettingsSchema.index({
  isActive: 1,
});


// =========================
// SINGLE ACTIVE SETTINGS
// =========================

paymentSettingsSchema.pre("save", async function () {
  if (!this.isActive) {
    return;
  }

  await this.constructor.updateMany(
    {
      _id: { $ne: this._id },
      isActive: true,
    },
    {
      $set: {
        isActive: false,
      },
    }
  );
});


export default mongoose.model(
  "PaymentSettings",
  paymentSettingsSchema
);