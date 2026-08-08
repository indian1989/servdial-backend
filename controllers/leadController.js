// backend/controllers/leadController.js

import asyncHandler from "express-async-handler";
import Lead from "../models/Lead.js";
import Business from "../models/Business.js";

// ============================================================
// PHONE HELPERS
// ============================================================

/**
 * Normalize an international phone number.
 *
 * Expected preferred input:
 *   +916200152506
 *   +447911123456
 *   +14155552671
 *
 * We DO NOT automatically assume +91.
 */
const normalizePhone = (phone) => {
  if (!phone) return "";

  const raw = String(phone).trim();

  if (!raw) return "";

  // Keep "+" only when it is the first character.
  if (raw.startsWith("+")) {
    return (
      "+" +
      raw
        .slice(1)
        .replace(/\D/g, "")
    );
  }

  // Backward compatibility:
  // If an old client sends digits without country code,
  // keep the digits but DO NOT guess the country.
  return raw.replace(/\D/g, "");
};


/**
 * Normalize country code.
 *
 * Examples:
 *   +91
 *   91
 *   +44
 *   44
 */
const normalizeCountryCode = (countryCode) => {
  if (!countryCode) return "";

  const raw = String(countryCode).trim();

  if (!raw) return "";

  const digits = raw.replace(/\D/g, "");

  if (!digits) return "";

  return `+${digits}`;
};


/**
 * Validate a phone number.
 *
 * We allow:
 *
 * +916200152506
 * +447911123456
 * +14155552671
 *
 * For backward compatibility, old local numbers
 * without "+" are also accepted.
 */
const isValidPhone = (phone) => {
  if (!phone) return false;

  const normalized = normalizePhone(phone);

  if (!normalized) return false;

  // International number
  if (normalized.startsWith("+")) {
    const digits = normalized.slice(1);

    // E.164 allows up to 15 digits.
    return (
      digits.length >= 7 &&
      digits.length <= 15
    );
  }

  // Legacy/local number support.
  const digits = normalized;

  return (
    digits.length >= 7 &&
    digits.length <= 15
  );
};


// ============================================================
// CREATE LEAD
// ============================================================

export const createLead = asyncHandler(
  async (req, res) => {

    const {
      businessId,
      userId,

      name,
      phone,
      countryCode,

      email,
      message,

      bookingType,
      source,

      bookingDate,
      bookingTime,
      guests,

      service,
      budget,
    } = req.body;


    // ========================================================
    // REQUIRED
    // ========================================================

    if (!businessId || !name || !phone) {
      return res.status(400).json({
        success: false,
        message:
          "Name, phone and business are required",
      });
    }


    // ========================================================
    // PHONE
    // ========================================================

    const normalizedPhone =
      normalizePhone(phone);

    if (!isValidPhone(normalizedPhone)) {
      return res.status(400).json({
        success: false,
        message:
          "Please provide a valid phone number",
      });
    }


    // ========================================================
    // COUNTRY CODE
    // ========================================================

    let normalizedCountryCode =
      normalizeCountryCode(countryCode);


    /*
     * If countryCode is not separately provided,
     * try extracting it from an international phone.
     *
     * IMPORTANT:
     *
     * We do NOT try to determine the exact country
     * from the number here.
     *
     * Example:
     *
     * +916200152506
     *
     * We keep:
     *
     * phone = +916200152506
     *
     * countryCode = ""
     *
     * unless frontend explicitly provides +91.
     *
     * This prevents incorrect country guessing.
     */


    // ========================================================
    // BUSINESS
    // ========================================================

    const business =
      await Business.findById(
        businessId
      );

    if (!business) {
      return res.status(404).json({
        success: false,
        message: "Business not found",
      });
    }


    // ========================================================
    // USER
    // ========================================================

    /*
     * Registered user:
     *
     * req.user._id
     *
     * Guest:
     *
     * null
     *
     * Authentication middleware available ho
     * to logged-in user ko priority denge.
     */

    let customerUserId =
      userId || null;

    if (req.user?._id) {
      customerUserId =
        req.user._id;
    }


    // ========================================================
    // LEAD TYPE
    // ========================================================

    const finalBookingType =
      bookingType || "enquiry";


    // ========================================================
    // SOURCE
    // ========================================================

    const finalSource =
      source || "form";


    // ========================================================
    // GUESTS
    // ========================================================

    let normalizedGuests = null;

    if (
      guests !== undefined &&
      guests !== null &&
      guests !== ""
    ) {
      const parsedGuests =
        Number(guests);

      if (
        !Number.isNaN(parsedGuests) &&
        parsedGuests >= 0
      ) {
        normalizedGuests =
          parsedGuests;
      }
    }


    // ========================================================
    // BUDGET
    // ========================================================

    let normalizedBudget = null;

    if (
      budget !== undefined &&
      budget !== null &&
      budget !== ""
    ) {
      const parsedBudget =
        Number(budget);

      if (
        !Number.isNaN(parsedBudget) &&
        parsedBudget >= 0
      ) {
        normalizedBudget =
          parsedBudget;
      }
    }


    // ========================================================
    // CREATE LEAD
    // ========================================================

    const lead =
      await Lead.create({

        // Business
        business: business._id,

        // Customer
        userId: customerUserId,

        name: String(name).trim(),

        phone: normalizedPhone,

        countryCode:
          normalizedCountryCode,

        email:
          email
            ? String(email).trim().toLowerCase()
            : "",

        message:
          message
            ? String(message).trim()
            : "",


        // Lead type
        bookingType:
          finalBookingType,

        // Source
        source:
          finalSource,


        // Booking
        bookingDate:
          bookingDate || "",

        bookingTime:
          bookingTime || "",

        guests:
          normalizedGuests,

        service:
          service
            ? String(service).trim()
            : "",

        budget:
          normalizedBudget,


        // Location snapshot
        cityId:
          business.cityId || null,

        cityName: business.cityName || "",
           state: business.state || "",
           country: business.country || "",


        // Initial status
        status: "new",
      });


    // ========================================================
    // RESPONSE
    // ========================================================

    res.status(201).json({
      success: true,

      message:
        "Lead created successfully",

      lead,
    });
  }
);


// ============================================================
// GET BUSINESS LEADS
// ============================================================

export const getBusinessLeads =
  asyncHandler(
    async (req, res) => {

      const business =
        await Business.findById(
          req.params.businessId
        );


      if (!business) {
        return res.status(404).json({
          success: false,
          message:
            "Business not found",
        });
      }


      // ======================================================
      // PROVIDER OWNERSHIP SECURITY
      // ======================================================

      if (
        req.user.role === "provider" &&
        String(business.owner) !==
          String(req.user._id)
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Unauthorized",
        });
      }


      // ======================================================
      // LEADS
      // ======================================================

      const leads =
        await Lead.find({
          business:
            req.params.businessId,
        })
          .populate(
            "userId",
            "name email phone"
          )
          .sort({
            createdAt: -1,
          });


      res.json({
        success: true,

        count:
          leads.length,

        leads,
      });
    }
  );


// ============================================================
// ADMIN - ALL LEADS
// ============================================================

export const getAllLeads =
  asyncHandler(
    async (req, res) => {

      const leads =
        await Lead.find()
          .populate(
            "business",
            "name cityId owner"
          )
          .populate(
            "userId",
            "name email phone"
          )
          .sort({
            createdAt: -1,
          });


      res.status(200).json({
        success: true,

        count:
          leads.length,

        leads,
      });
    }
  );