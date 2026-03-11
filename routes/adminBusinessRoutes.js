// backend/routes/adminBusinessRoutes.js

import express from "express";
import asyncHandler from "express-async-handler";

import Business from "../models/Business.js";
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();


// ================= GET ALL BUSINESSES =================
router.get(
  "/businesses",
  protect,
  authorizeRoles("admin", "superadmin"),
  asyncHandler(async (req, res) => {

    const businesses = await Business.find()
      .populate("city")
      .populate("category")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: businesses.length,
      businesses
    });

  })
);


// ================= GET PENDING BUSINESSES =================
router.get(
  "/businesses/pending",
  protect,
  authorizeRoles("admin", "superadmin"),
  asyncHandler(async (req, res) => {

    const businesses = await Business.find({ status: "pending" })
      .populate("city")
      .populate("category")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      businesses
    });

  })
);


// ================= APPROVE BUSINESS =================
router.put(
  "/business/:id/approve",
  protect,
  authorizeRoles("admin", "superadmin"),
  asyncHandler(async (req, res) => {

    const business = await Business.findById(req.params.id);

    if (!business) {
      res.status(404);
      throw new Error("Business not found");
    }

    business.status = "approved";

    await business.save();

    res.json({
      success: true,
      message: "Business approved successfully",
      business
    });

  })
);


// ================= REJECT BUSINESS =================
router.put(
  "/business/:id/reject",
  protect,
  authorizeRoles("admin", "superadmin"),
  asyncHandler(async (req, res) => {

    const business = await Business.findById(req.params.id);

    if (!business) {
      res.status(404);
      throw new Error("Business not found");
    }

    business.status = "rejected";

    await business.save();

    res.json({
      success: true,
      message: "Business rejected",
      business
    });

  })
);


// ================= FEATURE BUSINESS =================
router.put(
  "/business/:id/feature",
  protect,
  authorizeRoles("admin", "superadmin"),
  asyncHandler(async (req, res) => {

    const business = await Business.findById(req.params.id);

    if (!business) {
      res.status(404);
      throw new Error("Business not found");
    }

    business.isFeatured = !business.isFeatured;

    await business.save();

    res.json({
      success: true,
      message: "Featured status updated",
      business
    });

  })
);


// ================= DELETE BUSINESS =================
router.delete(
  "/business/:id",
  protect,
  authorizeRoles("admin", "superadmin"),
  asyncHandler(async (req, res) => {

    const business = await Business.findById(req.params.id);

    if (!business) {
      res.status(404);
      throw new Error("Business not found");
    }

    await business.deleteOne();

    res.json({
      success: true,
      message: "Business deleted successfully"
    });

  })
);


// ================= BUSINESS STATS =================
router.get(
  "/business-stats",
  protect,
  authorizeRoles("admin", "superadmin"),
  asyncHandler(async (req, res) => {

    const total = await Business.countDocuments();
    const approved = await Business.countDocuments({ status: "approved" });
    const pending = await Business.countDocuments({ status: "pending" });
    const rejected = await Business.countDocuments({ status: "rejected" });
    const featured = await Business.countDocuments({ isFeatured: true });

    res.json({
      success: true,
      stats: {
        total,
        approved,
        pending,
        rejected,
        featured
      }
    });

  })
);


export default router;