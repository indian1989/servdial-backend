// backend/controllers/paymentSettingsController.js

import asyncHandler from "express-async-handler";

import PaymentSettings from "../models/PaymentSettings.js";
import cloudinary from "../config/cloudinary.js";

// =========================================================
// HELPERS
// =========================================================

const isAdminUser = (req) => {
  const role = req.user?.role;

  return (
    role === "admin" ||
    role === "superadmin"
  );
};

const deleteQrFromCloudinary = async (publicId) => {
  if (!publicId) return;

  try {
    await cloudinary.uploader.destroy(publicId, {
      resource_type: "image",
    });
  } catch (error) {
    console.error(
      "Failed to delete old UPI QR from Cloudinary:",
      error
    );
  }
};


// =========================================================
// GET ACTIVE PAYMENT SETTINGS
// =========================================================
//
// Used by:
// - User
// - Provider
//
// Purpose:
// Show the currently active UPI / bank payment
// destination and payment instructions.
//
// Only active settings are returned.
//

export const getActivePaymentSettings =
  asyncHandler(async (req, res) => {
    const settings =
      await PaymentSettings.findOne({
        isActive: true,
      })
        .select(
          "-updatedBy"
        )
        .lean();

    if (!settings) {
      return res.status(404).json({
        success: false,
        message:
          "Payment settings are currently unavailable",
      });
    }

    return res.status(200).json({
      success: true,
      data: settings,
    });
  });


// =========================================================
// ADMIN — GET ALL PAYMENT SETTINGS
// =========================================================
//
// Useful for admin settings management/history.
//
// Only admin/superadmin can access this endpoint.
//

export const getAllPaymentSettings =
  asyncHandler(async (req, res) => {
    if (!isAdminUser(req)) {
      return res.status(403).json({
        success: false,
        message:
          "Admin access required",
      });
    }

    const settings =
      await PaymentSettings.find({})
        .populate(
          "updatedBy",
          "name email role"
        )
        .sort({
          createdAt: -1,
        })
        .lean();

    return res.status(200).json({
      success: true,
      data: settings,
    });
  });


// =========================================================
// ADMIN — GET CURRENT ACTIVE SETTINGS
// =========================================================

export const getAdminPaymentSettings =
  asyncHandler(async (req, res) => {
    if (!isAdminUser(req)) {
      return res.status(403).json({
        success: false,
        message:
          "Admin access required",
      });
    }

    const settings =
      await PaymentSettings.findOne({
        isActive: true,
      })
        .populate(
          "updatedBy",
          "name email role"
        )
        .lean();

    if (!settings) {
      return res.status(404).json({
        success: false,
        message:
          "No active payment settings found",
      });
    }

    return res.status(200).json({
      success: true,
      data: settings,
    });
  });


// =========================================================
// ADMIN — CREATE PAYMENT SETTINGS
// =========================================================
//
// Usually the first payment configuration.
//
// If isActive = true:
// PaymentSettings.pre("save") will automatically disable
// other settings documents.
//

export const createPaymentSettings =
  asyncHandler(async (req, res) => {
    if (!isAdminUser(req)) {
      return res.status(403).json({
        success: false,
        message:
          "Admin access required",
      });
    }

    const {
      isActive = true,
      upi = {},
      bank = {},
      instructions,
      receiptRequired = true,
    } = req.body;

    // =====================================================
    // UPI VALIDATION
    // =====================================================

    if (upi.enabled) {
  const hasUpiId =
    Boolean(upi.upiId?.trim());

  const hasQrCode =
  Boolean(upi.qrCode?.trim());

  if (
    !hasUpiId &&
    !hasQrCode
  ) {
    return res.status(400).json({
      success: false,
      message:
        "UPI ID or UPI QR code is required when UPI is enabled",
    });
  }

  if (!upi.accountName?.trim()) {
    return res.status(400).json({
      success: false,
      message:
        "UPI account name is required when UPI is enabled",
    });
  }
}

    // =====================================================
    // BANK VALIDATION
    // =====================================================

    if (bank.enabled) {
      if (!bank.accountName?.trim()) {
        return res.status(400).json({
          success: false,
          message:
            "Bank account name is required when bank transfer is enabled",
        });
      }

      if (!bank.accountNumber?.trim()) {
        return res.status(400).json({
          success: false,
          message:
            "Bank account number is required when bank transfer is enabled",
        });
      }

      if (!bank.ifsc?.trim()) {
        return res.status(400).json({
          success: false,
          message:
            "Bank IFSC is required when bank transfer is enabled",
        });
      }

      if (!bank.bankName?.trim()) {
        return res.status(400).json({
          success: false,
          message:
            "Bank name is required when bank transfer is enabled",
        });
      }
    }

    // =====================================================
    // AT LEAST ONE PAYMENT METHOD
    // =====================================================

    if (
      !upi.enabled &&
      !bank.enabled
    ) {
      return res.status(400).json({
        success: false,
        message:
          "At least one payment method must be enabled",
      });
    }

    // =====================================================
    // CREATE
    // =====================================================

    const settings =
      new PaymentSettings({
        isActive,

  upi: {
  enabled:
    Boolean(upi.enabled),

  upiId:
    upi.upiId?.trim() || "",

  accountName:
    upi.accountName?.trim() || "",

  qrCode:
    upi.qrCode?.trim() || "",

  qrCodePublicId:
    upi.qrCodePublicId?.trim() || "",
},

        bank: {
          enabled:
            Boolean(bank.enabled),

          accountName:
            bank.accountName?.trim() || "",

          accountNumber:
            bank.accountNumber?.trim() || "",

          ifsc:
            bank.ifsc
              ?.trim()
              .toUpperCase() || "",

          bankName:
            bank.bankName?.trim() || "",

          branchName:
            bank.branchName?.trim() || "",
        },

        instructions:
          instructions?.trim() ||
          "Please make the payment using the available payment method and upload the payment proof.",

        receiptRequired:
          Boolean(receiptRequired),

        updatedBy:
          req.user._id,
      });

    await settings.save();

    return res.status(201).json({
      success: true,
      message:
        "Payment settings created successfully",
      data: settings,
    });
  });


// =========================================================
// ADMIN — UPDATE PAYMENT SETTINGS
// =========================================================
//
// IMPORTANT:
//
// Do NOT use findOneAndUpdate() here.
//
// We intentionally use:
//
// findById()
// +
// .save()
//
// so PaymentSettings.pre("save") runs and maintains
// the single-active-settings rule.
//

export const updatePaymentSettings =
  asyncHandler(async (req, res) => {
    if (!isAdminUser(req)) {
      return res.status(403).json({
        success: false,
        message:
          "Admin access required",
      });
    }

    const { id } = req.params;

    const settings =
      await PaymentSettings.findById(id);

    if (!settings) {
      return res.status(404).json({
        success: false,
        message:
          "Payment settings not found",
      });
    }

    const {
      isActive,
      upi,
      bank,
      instructions,
      receiptRequired,
    } = req.body;

    // =====================================================
// QR CLEANUP TRACKING
// =====================================================

let oldQrPublicId = "";
let oldQrUrl = "";

let qrChanged = false;
let qrRemoved = false;

    // =====================================================
    // MERGE UPI
    // =====================================================

    if (upi !== undefined) {
const nextUpi = {
  enabled:
    upi.enabled !== undefined
      ? Boolean(upi.enabled)
      : settings.upi?.enabled,

  upiId:
    upi.upiId !== undefined
      ? upi.upiId.trim()
      : settings.upi?.upiId,

  accountName:
    upi.accountName !== undefined
      ? upi.accountName.trim()
      : settings.upi?.accountName,

  qrCode:
    upi.qrCode !== undefined
      ? upi.qrCode.trim()
      : settings.upi?.qrCode,

  qrCodePublicId:
    upi.qrCodePublicId !== undefined
      ? upi.qrCodePublicId.trim()
      : settings.upi?.qrCodePublicId,
};

      if (
  nextUpi.enabled &&
  !nextUpi.upiId &&
  !nextUpi.qrCode
) {
  return res.status(400).json({
    success: false,
    message:
      "UPI ID or UPI QR code is required when UPI is enabled",
  });
}

      if (
        nextUpi.enabled &&
        !nextUpi.accountName
      ) {
        return res.status(400).json({
          success: false,
          message:
            "UPI account name is required when UPI is enabled",
        });
      }

// =====================================================
// QR CHANGE DETECTION
// =====================================================

oldQrPublicId =
  settings.upi?.qrCodePublicId || "";

oldQrUrl =
  settings.upi?.qrCode || "";

const newQrPublicId =
  nextUpi.qrCodePublicId || "";

const newQrUrl =
  nextUpi.qrCode || "";

// QR was replaced with another QR
qrChanged =
  Boolean(oldQrPublicId) &&
  (
    oldQrPublicId !== newQrPublicId ||
    oldQrUrl !== newQrUrl
  );

// Existing QR was removed
qrRemoved =
  Boolean(oldQrPublicId) &&
  !newQrUrl;

settings.upi = nextUpi;
    }

    // =====================================================
    // MERGE BANK
    // =====================================================

    if (bank !== undefined) {
      const nextBank = {
        enabled:
          bank.enabled !== undefined
            ? Boolean(bank.enabled)
            : settings.bank?.enabled,

        accountName:
          bank.accountName !== undefined
            ? bank.accountName.trim()
            : settings.bank?.accountName,

        accountNumber:
          bank.accountNumber !== undefined
            ? bank.accountNumber.trim()
            : settings.bank?.accountNumber,

        ifsc:
          bank.ifsc !== undefined
            ? bank.ifsc
                .trim()
                .toUpperCase()
            : settings.bank?.ifsc,

        bankName:
          bank.bankName !== undefined
            ? bank.bankName.trim()
            : settings.bank?.bankName,

        branchName:
          bank.branchName !== undefined
            ? bank.branchName.trim()
            : settings.bank?.branchName,
      };

      if (
        nextBank.enabled &&
        !nextBank.accountName
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Bank account name is required when bank transfer is enabled",
        });
      }

      if (
        nextBank.enabled &&
        !nextBank.accountNumber
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Bank account number is required when bank transfer is enabled",
        });
      }

      if (
        nextBank.enabled &&
        !nextBank.ifsc
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Bank IFSC is required when bank transfer is enabled",
        });
      }

      if (
        nextBank.enabled &&
        !nextBank.bankName
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Bank name is required when bank transfer is enabled",
        });
      }

      settings.bank =
        nextBank;
    }

    // =====================================================
    // CHECK PAYMENT METHODS AFTER MERGE
    // =====================================================

    if (
      !settings.upi?.enabled &&
      !settings.bank?.enabled
    ) {
      return res.status(400).json({
        success: false,
        message:
          "At least one payment method must be enabled",
      });
    }

    // =====================================================
    // OTHER FIELDS
    // =====================================================

    // =====================================================
// ACTIVE STATUS
// =====================================================
//
// IMPORTANT:
// Do not allow the only active payment settings
// to be deactivated through the update endpoint.
//
// Activation is safe because pre("save") will
// automatically disable other active settings.
//
// Deactivation is allowed only when another
// active payment settings document already exists.
//

if (isActive !== undefined) {
  const nextIsActive = Boolean(isActive);

  if (
    !nextIsActive &&
    settings.isActive
  ) {
    const anotherActive =
      await PaymentSettings.findOne({
        _id: {
          $ne: settings._id,
        },
        isActive: true,
      }).lean();

    if (!anotherActive) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot deactivate the only active payment settings",
      });
    }
  }

  settings.isActive =
    nextIsActive;
}

    if (
      instructions !== undefined
    ) {
      settings.instructions =
        instructions.trim();
    }

    if (
      receiptRequired !== undefined
    ) {
      settings.receiptRequired =
        Boolean(receiptRequired);
    }

    // =====================================================
    // AUDIT
    // =====================================================

    settings.updatedBy =
      req.user._id;

    // =====================================================
    // SAVE
    // =====================================================
    //
    // IMPORTANT:
    // pre("save") executes here.
    //

await settings.save();

// =====================================================
// CLEANUP OLD UPI QR FROM CLOUDINARY
// =====================================================

if (qrChanged || qrRemoved) {
  await deleteQrFromCloudinary(
    oldQrPublicId
  );
}

return res.status(200).json({
      success: true,
      message:
        "Payment settings updated successfully",
      data: settings,
    });
  });


// =========================================================
// ADMIN — ACTIVATE PAYMENT SETTINGS
// =========================================================
//
// Activating one settings document automatically disables
// other active settings through pre("save").
//

export const activatePaymentSettings =
  asyncHandler(async (req, res) => {
    if (!isAdminUser(req)) {
      return res.status(403).json({
        success: false,
        message:
          "Admin access required",
      });
    }

    const { id } = req.params;

    const settings =
      await PaymentSettings.findById(id);

    if (!settings) {
      return res.status(404).json({
        success: false,
        message:
          "Payment settings not found",
      });
    }

    if (
      !settings.upi?.enabled &&
      !settings.bank?.enabled
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot activate settings without an enabled payment method",
      });
    }

    settings.isActive =
      true;

    settings.updatedBy =
      req.user._id;

    await settings.save();

    return res.status(200).json({
      success: true,
      message:
        "Payment settings activated successfully",
      data: settings,
    });
  });


// =========================================================
// ADMIN — DEACTIVATE PAYMENT SETTINGS
// =========================================================
//
// We intentionally allow deactivation only if another
// active configuration exists.
//
// This prevents accidentally leaving the entire payment
// system without a destination.
//

export const deactivatePaymentSettings =
  asyncHandler(async (req, res) => {
    if (!isAdminUser(req)) {
      return res.status(403).json({
        success: false,
        message:
          "Admin access required",
      });
    }

    const { id } = req.params;

    const settings =
      await PaymentSettings.findById(id);

    if (!settings) {
      return res.status(404).json({
        success: false,
        message:
          "Payment settings not found",
      });
    }

    if (!settings.isActive) {
      return res.status(200).json({
        success: true,
        message:
          "Payment settings are already inactive",
        data: settings,
      });
    }

    const anotherActive =
      await PaymentSettings.findOne({
        _id: {
          $ne: settings._id,
        },
        isActive: true,
      });

    if (!anotherActive) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot deactivate the only active payment settings",
      });
    }

    settings.isActive =
      false;

    settings.updatedBy =
      req.user._id;

    await settings.save();

    return res.status(200).json({
      success: true,
      message:
        "Payment settings deactivated successfully",
      data: settings,
    });
  });


// =========================================================
// ADMIN — DELETE PAYMENT SETTINGS
// =========================================================
//
// Payment settings contain historical payment destination
// information. Therefore deletion is intentionally
// restricted.
//
// Active settings cannot be deleted.
//
// Even inactive settings should normally be retained for
// audit/history. This endpoint is therefore NOT recommended
// for routine use.
//
// If you later need permanent deletion, add a separate
// superadmin-only controlled operation.
//

export const deletePaymentSettings =
  asyncHandler(async (req, res) => {
    if (
      req.user?.role !==
      "superadmin"
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Superadmin access required",
      });
    }

    const { id } = req.params;

    const settings =
      await PaymentSettings.findById(id);

    if (!settings) {
      return res.status(404).json({
        success: false,
        message:
          "Payment settings not found",
      });
    }

    if (settings.isActive) {
      return res.status(400).json({
        success: false,
        message:
          "Active payment settings cannot be deleted",
      });
    }

    await settings.deleteOne();

    return res.status(200).json({
      success: true,
      message:
        "Payment settings deleted successfully",
    });
  });