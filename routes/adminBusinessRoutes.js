// backend/routes/adminBusinessRoutes.js

import express from "express";
import asyncHandler from "express-async-handler";

import Business from "../models/Business.js";
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";
import {
  createCategory,
  getDashboardStats,
  getBusinessStats
} from "../controllers/adminController.js";
import { createBusiness } from "../controllers/businessController.js";

const router = express.Router();


// ================= GET ALL BUSINESSES =================
router.get(
  "/",
  protect,
  authorizeRoles("admin", "superadmin"),
  asyncHandler(async (req, res) => {

    const businesses = await Business.find()
  .setOptions({ includeAll: true })
  .populate("cityId", "name slug")
  .populate("categoryId")
  .sort({ createdAt: -1 });

res.json({
  success: true,
  count: businesses.length,
  data: businesses,
});

  })
);


// ================= GET PENDING BUSINESSES =================
router.get(
  "/pending",
  protect,
  authorizeRoles("admin", "superadmin"),
  asyncHandler(async (req, res) => {

    const businesses = await Business.find({ status: "pending" })
  .setOptions({ includeAll: true })
  .populate("cityId")
  .populate("categoryId")
  .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: business,
    });

  })
);


// ================= APPROVE BUSINESS =================
router.put(
  "/:id/approve",
  protect,
  authorizeRoles("admin", "superadmin"),
  asyncHandler(async (req, res) => {

    const business = await Business.findById(req.params.id)
    .setOptions({ includeAll: true });

    if (!business) {
      res.status(404);
      throw new Error("Business not found");
    }

    business.status = "approved";

    await business.save();

    res.json({
      success: true,
      message: "Business approved successfully",
      data: business,
    });

  })
);


// ================= REJECT BUSINESS =================
router.put(
  "/:id/reject",
  protect,
  authorizeRoles("admin", "superadmin"),
  asyncHandler(async (req, res) => {

    const business = await Business.findById(req.params.id)
    .setOptions({ includeAll: true });

    if (!business) {
      res.status(404);
      throw new Error("Business not found");
    }

    business.status = "rejected";

    await business.save();

    res.json({
      success: true,
      message: "Business rejected",
      data: business,
    });

  })
);


// ================= FEATURE BUSINESS =================
router.put(
  "/:id/feature",
  protect,
  authorizeRoles("admin", "superadmin"),
  asyncHandler(async (req, res) => {

    const business = await Business.findById(req.params.id)
    .setOptions({ includeAll: true });

    if (!business) {
      res.status(404);
      throw new Error("Business not found");
    }

    business.isFeatured = !business.isFeatured;

    await business.save();

    res.json({
      success: true,
      message: "Featured status updated",
      data: business,
    });

  })
);


// ================= DELETE BUSINESS =================
router.delete(
  "/:id",
  protect,
  authorizeRoles("admin", "superadmin"),
  asyncHandler(async (req, res) => {

    const business = await Business.findById(req.params.id)
    .setOptions({ includeAll: true });

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

router.post("/category", createCategory);

router.get("/admin/dashboard", getDashboardStats);
// ================= CREATE BUSINESS (ADMIN) =================
router.post(
  "/",
  protect,
  authorizeRoles("admin", "superadmin"),
  createBusiness
);
export default router;