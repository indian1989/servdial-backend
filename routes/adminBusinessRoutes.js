import express from "express";

import {
  getAllBusinessesAdmin,
  approveBusiness,
  rejectBusiness,
  deleteBusinessAdmin,
  toggleFeatured,
  getBusinessStats,
} from "../controllers/adminBusinessController.js";

import {
  createBusiness,
  updateBusiness
} from "../controllers/businessController.js";

import { protect, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

// 🔐 Admin protection
router.use(protect);
router.use(authorizeRoles("admin", "superadmin"));

// ================= CRUD (SOURCE OF TRUTH) =================

// CREATE → from businessController
router.post("/", createBusiness);

// UPDATE → from businessController
router.put("/:id", updateBusiness);

// DELETE → admin-controlled
router.delete("/:id", deleteBusinessAdmin);

// ================= ADMIN ACTIONS =================

router.get("/", getAllBusinessesAdmin);

router.put("/:id/approve", approveBusiness);
router.put("/:id/reject", rejectBusiness);
router.put("/:id/feature", toggleFeatured);

// ================= STATS =================

router.get("/business-stats", getBusinessStats);

export default router;