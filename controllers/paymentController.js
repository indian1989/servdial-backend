// backend/controllers/paymentController.js

import asyncHandler from "express-async-handler";
import mongoose from "mongoose";

import Payment from "../models/Payment.js";
import PaymentSettings from "../models/PaymentSettings.js";
import Banner from "../models/Banner.js";

/*
 * =========================================================
 * PAYMENT CONTROLLER
 * =========================================================
 *
 * Central payment controller for all paid ServDial services.
 *
 * Supported services:
 * - banner
 * - lead
 * - featured_business
 * - premium_listing
 * - subscription
 * - promotion
 * - boost
 *
 * Payment flow:
 *
 * User / Provider
 *      ↓
 * Create payment
 *      ↓
 * Make manual UPI / Bank payment
 *      ↓
 * Upload payment proof
 *      ↓
 * Admin verification
 *      ↓
 * verified / rejected
 *      ↓
 * Service activation handled separately
 *
 * IMPORTANT:
 * Payment verification and service approval are separate.
 *
 * A verified payment MUST NOT automatically make
 * a banner approved/public.
 */

// =========================================================
// HELPERS
// =========================================================

const SERVICE_TYPES = [
  "banner",
  "lead",
  "featured_business",
  "premium_listing",
  "subscription",
  "promotion",
  "boost",
];

const PAYMENT_METHODS = [
  "upi",
  "bank_transfer",
];

const PAYER_ROLES = [
  "user",
  "provider",
];

const generatePaymentNumber = () => {
  const timestamp = Date.now().toString(36).toUpperCase();

  const random = Math.random()
    .toString(36)
    .substring(2, 8)
    .toUpperCase();

  return `SDP-${timestamp}-${random}`;
};

const generateReceiptNumber = () => {
  const timestamp = Date.now().toString(36).toUpperCase();

  const random = Math.random()
    .toString(36)
    .substring(2, 7)
    .toUpperCase();

  return `SDR-${timestamp}-${random}`;
};

const getActivePaymentSettings = async () => {
  return PaymentSettings.findOne({
    isActive: true,
  }).lean();
};

const isAdminUser = (req) => {
  const role = req.user?.role;

  return (
    role === "admin" ||
    role === "superadmin"
  );
};


// =========================================================
// GET ACTIVE PAYMENT SETTINGS
// =========================================================
//
// User / Provider can see payment instructions.
//
// IMPORTANT:
// Full bank account number is intentionally exposed only
// because the user needs payment destination information.
// This endpoint should be protected by authentication.
//
// If you want public payment settings later, create a
// separate sanitized public endpoint.
//

export const getPaymentSettings = asyncHandler(
  async (req, res) => {
    const settings =
      await getActivePaymentSettings();

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
  }
);


// =========================================================
// CREATE PAYMENT
// =========================================================
//
// Creates a payment record before the customer makes
// the manual UPI / bank transfer.
//
// Required:
// - serviceType
// - serviceId
// - amount
// - paymentMethod
//
// The payment destination is snapshotted from the currently
// active PaymentSettings document.
//
// The complete bank account number is NEVER stored in Payment.
// Only last 4 digits are stored.
//

export const createPayment = asyncHandler(
  async (req, res) => {
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const {
      serviceType,
      serviceId,
      amount,
      currency = "INR",
      paymentMethod,
      paymentDate,
      notes,
    } = req.body;

    // =====================================================
    // BASIC VALIDATION
    // =====================================================

    if (
      !serviceType ||
      !SERVICE_TYPES.includes(serviceType)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid service type",
      });
    }

    if (
      !serviceId ||
      !mongoose.Types.ObjectId.isValid(
        serviceId
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid service ID",
      });
    }

    const numericAmount = Number(amount);

    if (
      !Number.isFinite(numericAmount) ||
      numericAmount <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment amount",
      });
    }

    if (
      !paymentMethod ||
      !PAYMENT_METHODS.includes(paymentMethod)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment method",
      });
    }

    // =====================================================
// SERVICE OWNERSHIP + AMOUNT VALIDATION
// =====================================================
let finalPaymentAmount = numericAmount;

if (serviceType === "banner") {
  const banner = await Banner.findById(serviceId).lean();

  if (!banner) {
    return res.status(404).json({
      success: false,
      message: "Banner not found",
    });
  }

  // User/provider can only pay for their own banner.
  if (
    !isAdminUser(req) &&
    String(banner.createdBy) !== String(userId)
  ) {
    return res.status(403).json({
      success: false,
      message:
        "You are not authorized to make payment for this banner",
    });
  }

  // ===================================================
  // SERVER-SIDE BANNER PRICE VALIDATION
  // ===================================================
  // Banner.price is the ONLY source of truth.
  // Never trust amount sent by frontend.

  const bannerPrice = Number(banner.price);

  if (
    !Number.isFinite(bannerPrice) ||
    bannerPrice <= 0
  ) {
    return res.status(400).json({
      success: false,
      message:
        "Banner price is not configured correctly",
    });
  }

  // Frontend amount must exactly match
  // the server-side banner price.
  if (
    !Number.isFinite(numericAmount) ||
    numericAmount !== bannerPrice
  ) {
    return res.status(400).json({
      success: false,
      message:
        "Invalid payment amount for this banner",
    });
  }

  finalPaymentAmount = bannerPrice;
}

    // =====================================================
    // PAYER ROLE
    // =====================================================

    const payerRole =
  req.user?.role;

if (!PAYER_ROLES.includes(payerRole)) {
  return res.status(403).json({
    success: false,
    message:
      "Only users and providers can create payments",
  });
}
     

    // =====================================================
    // PAYMENT SETTINGS
    // =====================================================

    const settings =
      await getActivePaymentSettings();

    if (!settings) {
      return res.status(503).json({
        success: false,
        message:
          "Payment system is currently unavailable",
      });
    }


    if (paymentMethod === "upi") {
  if (!settings.upi?.enabled) {
    return res.status(400).json({
      success: false,
      message: "UPI payment is currently unavailable",
    });
  }

  if (!settings.upi?.upiId?.trim()) {
    return res.status(503).json({
      success: false,
      message:
        "UPI payment is enabled but UPI ID is not configured",
    });
  }
}

if (paymentMethod === "bank_transfer") {
  if (!settings.bank?.enabled) {
    return res.status(400).json({
      success: false,
      message:
        "Bank transfer is currently unavailable",
    });
  }

  if (
    !settings.bank?.accountNumber ||
    !settings.bank?.ifsc ||
    !settings.bank?.bankName
  ) {
    return res.status(503).json({
      success: false,
      message:
        "Bank payment is enabled but bank details are incomplete",
    });
  }
}

    // =====================================================
    // PREVENT DUPLICATE ACTIVE PAYMENT
    // =====================================================

    const existingPayment =
      await Payment.findOne({
        userId,
        serviceType,
        serviceId,
        status: {
          $in: [
            "pending",
            "processing",
            "verified",
          ],
        },
      });


    if (existingPayment) {
      return res.status(409).json({
        success: false,
        message:
          "A payment already exists for this service",
        data: existingPayment,
      });
    }

    let parsedPaymentDate = new Date();

if (paymentDate) {
  parsedPaymentDate = new Date(paymentDate);

  if (Number.isNaN(parsedPaymentDate.getTime())) {
    return res.status(400).json({
      success: false,
      message: "Invalid payment date",
    });
  }
}

    // =====================================================
    // PAYMENT DESTINATION SNAPSHOT
    // =====================================================

    const paymentData = {
      userId,

      payerRole,

      serviceType,

      serviceId,

      paymentNumber:
        generatePaymentNumber(),

      amount: finalPaymentAmount,

      currency:
        String(currency)
          .trim()
          .toUpperCase(),

      paymentMethod,

      paymentDate: parsedPaymentDate,

      status: "pending",

      submittedAt: new Date(),

      notes:
        notes?.trim() || undefined,
    };

    // =====================================================
    // UPI SNAPSHOT
    // =====================================================

    if (paymentMethod === "upi") {
      paymentData.paymentAccountName =
        settings.upi?.accountName || "";

      paymentData.paymentUpiId =
        settings.upi?.upiId || "";
    }

    // =====================================================
    // BANK SNAPSHOT
    // =====================================================

    if (
      paymentMethod ===
      "bank_transfer"
    ) {
      const accountNumber =
        settings.bank?.accountNumber || "";

      paymentData.paymentAccountName =
        settings.bank?.accountName || "";

      paymentData.paymentBankName =
        settings.bank?.bankName || "";

      paymentData.paymentBankIfsc =
        settings.bank?.ifsc || "";

      paymentData.paymentBankAccountLast4 =
        accountNumber
          ? accountNumber.slice(-4)
          : "";
    }

    // =====================================================
    // CREATE
    // =====================================================

    const payment =
      await Payment.create(
        paymentData
      );

    return res.status(201).json({
      success: true,
      message:
        "Payment record created successfully",
      data: payment,
    });
  }
);


// =========================================================
// SUBMIT PAYMENT PROOF
// =========================================================
//
// Proof image itself is uploaded through Cloudinary.
// This controller only stores the returned Cloudinary URL
// and public ID.
//
// Expected body:
// - proofImage
// - proofPublicId
//
// The actual Cloudinary upload should happen through the
// existing upload service / frontend flow.
//

export const submitPaymentProof =
  asyncHandler(async (req, res) => {
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const { id } = req.params;

    if (
      !mongoose.Types.ObjectId.isValid(id)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment ID",
      });
    }

    const {
  proofImage,
  proofPublicId,
  transactionId,
} = req.body;

    if (!proofImage) {
      return res.status(400).json({
        success: false,
        message:
          "Payment proof image is required",
      });
    }

    if (!transactionId?.trim()) {
  return res.status(400).json({
    success: false,
    message: "Transaction ID is required",
  });
}

    const payment =
      await Payment.findOne({
        _id: id,
        userId,
      });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    if (
      ![
        "pending",
        "processing",
      ].includes(payment.status)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Payment proof cannot be submitted for the current payment status",
      });
    }

    payment.proofImage =
      proofImage.trim();

    payment.transactionId =
  transactionId.trim();

    payment.proofPublicId =
      proofPublicId?.trim() || "";

    payment.proofUploadedAt =
      new Date();

    payment.status =
      "processing";

const existingTransaction =
  await Payment.findOne({
    _id: { $ne: payment._id },
    transactionId: transactionId.trim(),
    status: {
      $nin: [
        "cancelled",
        "rejected",
      ],
    },
  });

if (existingTransaction) {
  return res.status(409).json({
    success: false,
    message:
      "This transaction ID has already been submitted",
  });
}

    await payment.save();

    return res.status(200).json({
      success: true,
      message:
        "Payment proof submitted successfully",
      data: payment,
    });
  });


// =========================================================
// GET MY PAYMENTS
// =========================================================

export const getMyPayments =
  asyncHandler(async (req, res) => {
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const {
      serviceType,
      status,
      page = 1,
      limit = 20,
    } = req.query;

    const filter = {
      userId,
    };

    if (
      serviceType &&
      SERVICE_TYPES.includes(serviceType)
    ) {
      filter.serviceType =
        serviceType;
    }

    if (status) {
      filter.status = status;
    }

    const pageNumber =
      Math.max(
        Number(page) || 1,
        1
      );

    const limitNumber =
      Math.min(
        Math.max(
          Number(limit) || 20,
          1
        ),
        100
      );

    const skip =
      (pageNumber - 1) *
      limitNumber;

    const [
      payments,
      total,
    ] = await Promise.all([
      Payment.find(filter)
        .sort({
          createdAt: -1,
        })
        .skip(skip)
        .limit(limitNumber)
        .lean(),

      Payment.countDocuments(
        filter
      ),
    ]);

    return res.status(200).json({
      success: true,
      data: payments,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total,
        pages: Math.ceil(
          total / limitNumber
        ),
      },
    });
  });


// =========================================================
// GET SINGLE PAYMENT
// =========================================================

export const getPaymentById =
  asyncHandler(async (req, res) => {
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const { id } = req.params;

    if (
      !mongoose.Types.ObjectId.isValid(id)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment ID",
      });
    }

    const filter = {
      _id: id,
    };

    // Non-admin users can only see
    // their own payments.
    if (!isAdminUser(req)) {
      filter.userId = userId;
    }

    const payment =
      await Payment.findOne(filter)
        .lean();

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: payment,
    });
  });


// =========================================================
// ADMIN — GET ALL PAYMENTS
// =========================================================

export const getAllPayments =
  asyncHandler(async (req, res) => {
    if (!isAdminUser(req)) {
      return res.status(403).json({
        success: false,
        message: "Admin access required",
      });
    }

    const {
      status,
      serviceType,
      payerRole,
      page = 1,
      limit = 20,
    } = req.query;

    const filter = {};

    if (status) {
  const statuses = status
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  filter.status =
    statuses.length > 1
      ? { $in: statuses }
      : statuses[0];
}

    if (
      serviceType &&
      SERVICE_TYPES.includes(serviceType)
    ) {
      filter.serviceType =
        serviceType;
    }

    if (
      payerRole &&
      PAYER_ROLES.includes(payerRole)
    ) {
      filter.payerRole =
        payerRole;
    }

    const pageNumber =
      Math.max(
        Number(page) || 1,
        1
      );

    const limitNumber =
      Math.min(
        Math.max(
          Number(limit) || 20,
          1
        ),
        100
      );

    const skip =
      (pageNumber - 1) *
      limitNumber;

    const [
      payments,
      total,
    ] = await Promise.all([
      Payment.find(filter)
        .populate(
          "userId",
          "name email phone role"
        )
        .populate(
          "verifiedBy",
          "name email"
        )
        .sort({
          createdAt: -1,
        })
        .skip(skip)
        .limit(limitNumber)
        .lean(),

      Payment.countDocuments(
        filter
      ),
    ]);

    return res.status(200).json({
      success: true,
      data: payments,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total,
        pages: Math.ceil(
          total / limitNumber
        ),
      },
    });
  });


// =========================================================
// ADMIN — VERIFY PAYMENT
// =========================================================
//
// IMPORTANT:
// Verification only confirms that payment has been
// received.
//
// It does NOT automatically approve the associated service.
//
// Banner approval remains a separate admin operation.
//

export const verifyPayment =
  asyncHandler(async (req, res) => {
    if (!isAdminUser(req)) {
      return res.status(403).json({
        success: false,
        message: "Admin access required",
      });
    }

    const { id } = req.params;

    if (
      !mongoose.Types.ObjectId.isValid(id)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment ID",
      });
    }

    const payment =
      await Payment.findById(id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    if (
      payment.status ===
      "verified"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Payment is already verified",
      });
    }

    if (
  [
    "rejected",
    "refunded",
    "cancelled",
  ].includes(payment.status)
) {
  return res.status(400).json({
    success: false,
    message:
      "This payment cannot be verified",
  });
}

if (!payment.proofImage) {
  return res.status(400).json({
    success: false,
    message:
      "Payment proof must be submitted before verification",
  });
}

if (!payment.transactionId?.trim()) {
  return res.status(400).json({
    success: false,
    message:
      "Transaction ID is required before verification",
  });
}

    const now = new Date();

    payment.status =
      "verified";

    payment.verifiedBy =
      req.user._id;

    payment.verifiedAt =
      now;

    payment.processedAt =
      now;

    // =====================================================
    // RECEIPT
    // =====================================================

    if (!payment.receiptNumber) {
      payment.receiptNumber =
        generateReceiptNumber();

      payment.receiptGeneratedAt =
        now;
    }

    // =====================================================
    // PROOF RETENTION
    // =====================================================

    if (
      payment.proofImage &&
      !payment.proofDeleteAfter
    ) {
      const retentionDays =
        Number(
          payment.proofRetentionDays
        );

      const days =
        Number.isFinite(
          retentionDays
        )
          ? retentionDays
          : 180;

      const deleteAfter =
        new Date(now);

      deleteAfter.setDate(
        deleteAfter.getDate() +
          days
      );

      payment.proofDeleteAfter =
        deleteAfter;
    }

    await payment.save();

    // =====================================================
    // SERVICE-SPECIFIC POST VERIFICATION
    // =====================================================
    //
    // Currently banner has paymentStatus.
    //
    // We update ONLY paymentStatus.
    //
    // Banner.status remains unchanged.
    //
    // This preserves the separate:
    //
    // PAYMENT VERIFICATION
    //        +
    // BANNER MODERATION
    //
    // architecture.

    if (
      payment.serviceType ===
      "banner"
    ) {
      const banner =
        await Banner.findById(
          payment.serviceId
        );

      if (banner) {
        banner.paymentStatus =
          "paid";

        banner.paymentId =
        payment._id;

        await banner.save();
      }
    }

    return res.status(200).json({
      success: true,
      message:
        "Payment verified successfully",
      data: payment,
    });
  });


// =========================================================
// ADMIN — REJECT PAYMENT
// =========================================================

export const rejectPayment =
  asyncHandler(async (req, res) => {
    if (!isAdminUser(req)) {
      return res.status(403).json({
        success: false,
        message: "Admin access required",
      });
    }

    const { id } = req.params;

    const {
      rejectionReason,
    } = req.body;

    if (
      !mongoose.Types.ObjectId.isValid(id)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment ID",
      });
    }

    if (
      !rejectionReason?.trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Rejection reason is required",
      });
    }

    const payment =
      await Payment.findById(id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    if (
      [
        "verified",
        "refunded",
        "cancelled",
      ].includes(payment.status)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "This payment cannot be rejected",
      });
    }

    payment.status =
      "rejected";

    payment.rejectionReason =
      rejectionReason.trim();

    payment.verifiedBy =
      req.user._id;

    payment.verifiedAt =
      new Date();

    payment.processedAt =
      new Date();

    await payment.save();

    // =====================================================
    // BANNER
    // =====================================================

    if (
      payment.serviceType ===
      "banner"
    ) {
      const banner =
        await Banner.findById(
          payment.serviceId
        );

      if (banner) {
        banner.paymentStatus =
        "pending";

        banner.paymentId =
        undefined;

        await banner.save();
      }
    }

    return res.status(200).json({
      success: true,
      message:
        "Payment rejected successfully",
      data: payment,
    });
  });


// =========================================================
// ADMIN — REFUND PAYMENT
// =========================================================

export const refundPayment =
  asyncHandler(async (req, res) => {
    if (!isAdminUser(req)) {
      return res.status(403).json({
        success: false,
        message: "Admin access required",
      });
    }

    const { id } = req.params;

    const {
      refundReference,
      notes,
    } = req.body;

    if (
      !mongoose.Types.ObjectId.isValid(id)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment ID",
      });
    }

    if (
      !refundReference?.trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Refund reference is required",
      });
    }

    const payment =
      await Payment.findById(id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    if (
      payment.status !==
      "verified"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Only verified payments can be refunded",
      });
    }

    payment.status =
      "refunded";

    payment.refundedAt =
      new Date();

    payment.refundReference =
      refundReference.trim();

    if (notes?.trim()) {
      payment.notes =
        notes.trim();
    }

    await payment.save();

    // =====================================================
    // BANNER
    // =====================================================

    if (
  payment.serviceType ===
  "banner"
) {
  const banner =
    await Banner.findById(
      payment.serviceId
    );

  if (banner) {
    banner.paymentStatus =
      "refunded";

    banner.paymentId =
      undefined;

    await banner.save();
  }
}

    return res.status(200).json({
      success: true,
      message:
        "Payment refunded successfully",
      data: payment,
    });
  });


// =========================================================
// ADMIN — CANCEL PAYMENT
// =========================================================

export const cancelPayment =
  asyncHandler(async (req, res) => {
    if (!isAdminUser(req)) {
      return res.status(403).json({
        success: false,
        message: "Admin access required",
      });
    }

    const { id } = req.params;

    if (
      !mongoose.Types.ObjectId.isValid(id)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment ID",
      });
    }

    const payment =
      await Payment.findById(id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    if (
      [
        "verified",
        "refunded",
      ].includes(payment.status)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "This payment cannot be cancelled",
      });
    }

    payment.status =
      "cancelled";

    payment.processedAt =
      new Date();

    await payment.save();

    return res.status(200).json({
      success: true,
      message:
        "Payment cancelled successfully",
      data: payment,
    });
  });