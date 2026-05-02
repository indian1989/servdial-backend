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
  updateBusiness,
} from "../controllers/businessController.js";

import { protect, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

/* ================= AUTH LOCK ================= */
router.use(protect);
router.use(authorizeRoles("admin", "superadmin"));

/* ================= CRUD (SSOT) ================= */
router.post("/", createBusiness);
router.put("/:id", updateBusiness);

/* ================= ADMIN ACTIONS ================= */
router.get("/", getAllBusinessesAdmin);

router.put("/:id/approve", approveBusiness);
router.put("/:id/reject", rejectBusiness);
router.put("/:id/feature", toggleFeatured);

router.delete("/:id", deleteBusinessAdmin);

/* ================= STATS ================= */
router.get("/business-stats", getBusinessStats);

export default router;