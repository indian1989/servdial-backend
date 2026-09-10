import asyncHandler from "express-async-handler";
import mongoose from "mongoose";

import TemporaryListing from "../../models/TemporaryListing.js";

/* ======================================================
   HELPERS
====================================================== */

const isValidObjectId = (id) =>
  mongoose.Types.ObjectId.isValid(id);

const getUserId = (req) =>
  req.user?._id || req.user?.id || null;

const isAdmin = (req) =>
  req.user?.role === "admin" ||
  req.user?.role === "superadmin";


/* ======================================================
   CREATE TEMPORARY LISTING
====================================================== */

export const createTemporaryListing = asyncHandler(
  async (req, res) => {

    const {
      title,
      category,
      description,
      price,
      location,
      city,
      state,
      pincode,
      phone,
      landline,
      whatsapp,
      images,
      expiryDate,
      metadata,
    } = req.body;

    /* ==================================================
       BASIC VALIDATION
    ================================================== */

    if (!title || !String(title).trim()) {
      return res.status(400).json({
        success: false,
        message: "Listing title is required",
      });
    }

    if (!phone && !landline) {
      return res.status(400).json({
        success: false,
        message:
          "At least one contact number is required: Mobile or Landline",
      });
    }

    /* ==================================================
       EXPIRY DATE
    ================================================== */

    if (!expiryDate) {
      return res.status(400).json({
        success: false,
        message: "Expiry date is required",
      });
    }

    const parsedExpiryDate = new Date(expiryDate);

    if (isNaN(parsedExpiryDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid expiry date",
      });
    }

    if (parsedExpiryDate <= new Date()) {
      return res.status(400).json({
        success: false,
        message: "Expiry date must be in the future",
      });
    }

    /* ==================================================
       CONTACT NORMALIZATION
    ================================================== */

    const cleanPhone = phone
      ? String(phone).replace(/\D/g, "").slice(-10)
      : "";

    const cleanLandline = landline
      ? String(landline).replace(/\D/g, "")
      : "";

    const cleanWhatsapp = whatsapp
      ? String(whatsapp).replace(/\D/g, "").slice(-10)
      : "";

    if (cleanPhone && cleanPhone.length !== 10) {
      return res.status(400).json({
        success: false,
        message: "Mobile number must be 10 digits",
      });
    }

    if (
      cleanLandline &&
      (cleanLandline.length < 6 ||
        cleanLandline.length > 12)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Landline number must be between 6 and 12 digits",
      });
    }

    if (
      cleanWhatsapp &&
      cleanWhatsapp.length !== 10
    ) {
      return res.status(400).json({
        success: false,
        message: "WhatsApp number must be 10 digits",
      });
    }

    /* ==================================================
       STATUS
       
       Admin/Superadmin:
       → approved

       Provider:
       → pending
    ================================================== */

    const status = isAdmin(req)
      ? "approved"
      : "pending";

    /* ==================================================
       CREATE
       
       Listing Type is ALWAYS temporary.
       It does not come from frontend.
    ================================================== */

    const temporaryListing =
      await TemporaryListing.create({

        listingType: "Temporary Listing",

        title: String(title).trim(),

        category:
          category ||
          "",

        description:
          description ||
          "",

        price:
          price !== undefined &&
          price !== null &&
          price !== ""
            ? Number(price)
            : null,

        location:
          location || null,

        city:
          city || "",

        state:
          state || "",

        pincode:
          pincode || "",

        phone:
          cleanPhone,

        landline:
          cleanLandline,

        whatsapp:
          cleanWhatsapp,

        images:
          Array.isArray(images)
            ? images
            : [],

        metadata:
          metadata || {},

        expiryDate:
          parsedExpiryDate,

        status,

        owner:
          isAdmin(req)
            ? null
            : getUserId(req),

        createdBy:
          getUserId(req),

      });

    /* ==================================================
       RESPONSE
    ================================================== */

    return res.status(201).json({
      success: true,
      message:
        "Temporary listing created successfully",
      data: temporaryListing,
    });
  }
);


/* ======================================================
   GET ALL TEMPORARY LISTINGS
   ADMIN
====================================================== */

export const getAllTemporaryListings =
  asyncHandler(async (req, res) => {

    const listings =
      await TemporaryListing.find()
        .populate(
          "owner",
          "name email role"
        )
        .sort({
          createdAt: -1,
        });

    res.json({
      success: true,
      data: listings,
    });
  });


/* ======================================================
   GET PUBLIC TEMPORARY LISTINGS
====================================================== */

export const getPublicTemporaryListings =
  asyncHandler(async (req, res) => {

    const now = new Date();

    const listings =
      await TemporaryListing.find({
        status: "approved",
        expiryDate: {
          $gt: now,
        },
      })
        .sort({
          createdAt: -1,
        });

    res.json({
      success: true,
      data: listings,
    });
  });


/* ======================================================
   GET SINGLE TEMPORARY LISTING
====================================================== */

export const getTemporaryListing =
  asyncHandler(async (req, res) => {

    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid temporary listing ID",
      });
    }

    const listing =
      await TemporaryListing.findById(id)
        .populate(
          "owner",
          "name email role"
        );

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: "Temporary listing not found",
      });
    }

    res.json({
      success: true,
      data: listing,
    });
  });


/* ======================================================
   GET PROVIDER TEMPORARY LISTINGS
====================================================== */

export const getProviderTemporaryListings =
  asyncHandler(async (req, res) => {

    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const listings =
      await TemporaryListing.find({
        owner: userId,
      }).sort({
        createdAt: -1,
      });

    res.json({
      success: true,
      data: listings,
    });
  });


/* ======================================================
   UPDATE TEMPORARY LISTING
====================================================== */

export const updateTemporaryListing =
  asyncHandler(async (req, res) => {

    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid temporary listing ID",
      });
    }

    const listing =
      await TemporaryListing.findById(id);

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: "Temporary listing not found",
      });
    }

    const userId = getUserId(req);

    /* ==================================================
       PROVIDER OWNERSHIP CHECK
    ================================================== */

    if (
      !isAdmin(req) &&
      String(listing.owner) !== String(userId)
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You are not authorized to update this listing",
      });
    }

    /* ==================================================
       ALLOWED FIELDS
       
       listingType is intentionally NOT accepted.
    ================================================== */

    const allowedFields = [
      "title",
      "category",
      "description",
      "price",
      "location",
      "city",
      "state",
      "pincode",
      "phone",
      "landline",
      "whatsapp",
      "images",
      "expiryDate",
      "metadata",
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        listing[field] = req.body[field];
      }
    });

    /* ==================================================
       EXPIRY VALIDATION
    ================================================== */

    if (req.body.expiryDate !== undefined) {

      const newExpiryDate =
        new Date(req.body.expiryDate);

      if (
        isNaN(newExpiryDate.getTime()) ||
        newExpiryDate <= new Date()
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Expiry date must be a valid future date",
        });
      }

      listing.expiryDate =
        newExpiryDate;
    }

    /* ==================================================
       LISTING TYPE LOCK
    ================================================== */

    listing.listingType =
      "Temporary Listing";

    listing.updatedAt =
      new Date();

    await listing.save();

    res.json({
      success: true,
      message:
        "Temporary listing updated successfully",
      data: listing,
    });
  });


/* ======================================================
   APPROVE TEMPORARY LISTING
   ADMIN
====================================================== */

export const approveTemporaryListing =
  asyncHandler(async (req, res) => {

    const listing =
      await TemporaryListing.findById(
        req.params.id
      );

    if (!listing) {
      return res.status(404).json({
        success: false,
        message:
          "Temporary listing not found",
      });
    }

    if (
      listing.expiryDate &&
      new Date(listing.expiryDate) <= new Date()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "This temporary listing has already expired",
      });
    }

    listing.status =
      "approved";

    listing.updatedAt =
      new Date();

    await listing.save();

    res.json({
      success: true,
      message:
        "Temporary listing approved",
      data: listing,
    });
  });


/* ======================================================
   REJECT TEMPORARY LISTING
   ADMIN
====================================================== */

export const rejectTemporaryListing =
  asyncHandler(async (req, res) => {

    const listing =
      await TemporaryListing.findById(
        req.params.id
      );

    if (!listing) {
      return res.status(404).json({
        success: false,
        message:
          "Temporary listing not found",
      });
    }

    listing.status =
      "rejected";

    listing.updatedAt =
      new Date();

    await listing.save();

    res.json({
      success: true,
      message:
        "Temporary listing rejected",
      data: listing,
    });
  });


/* ======================================================
   DELETE TEMPORARY LISTING
====================================================== */

export const deleteTemporaryListing =
  asyncHandler(async (req, res) => {

    const listing =
      await TemporaryListing.findById(
        req.params.id
      );

    if (!listing) {
      return res.status(404).json({
        success: false,
        message:
          "Temporary listing not found",
      });
    }

    const userId = getUserId(req);

    if (
      !isAdmin(req) &&
      String(listing.owner) !== String(userId)
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You are not authorized to delete this listing",
      });
    }

    await TemporaryListing.findByIdAndDelete(
      req.params.id
    );

    res.json({
      success: true,
      message:
        "Temporary listing deleted successfully",
    });
  });