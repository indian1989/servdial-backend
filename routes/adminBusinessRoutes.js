// backend/routes/adminBusinessRoutes.js
import express from "express";

import {
  getAllBusinessesAdmin,
  approveBusiness,
  rejectBusiness,
  deleteBusinessAdmin,
  toggleFeatured,
  getBusinessStats,
  toggleVerifiedBusiness,
} from "../controllers/adminBusinessController.js";

import {
  createBusiness,
  updateBusiness,
} from "../controllers/businessController.js";

import {
  protect,
  authorizeRoles,
} from "../middleware/authMiddleware.js";

const router = express.Router();

/* ======================================================
   AUTH LOCK (ADMIN / SUPERADMIN ONLY)
====================================================== */
router.use(protect);
router.use(authorizeRoles("admin", "superadmin"));

/* ======================================================
   BUSINESS STATS (PUT FIRST - AVOID PARAM CONFLICTS)
====================================================== */
router.get("/business-stats", getBusinessStats);

/* ======================================================
   ADMIN BUSINESS LIST
====================================================== */
router.get("/", getAllBusinessesAdmin);

/* ======================================================
   CREATE / UPDATE BUSINESS (ADMIN SEED FLOW)
   - used for system-created businesses
   - later claimable by providers
====================================================== */
router.post("/", createBusiness);
router.put("/:id", updateBusiness);

/* ======================================================
   MODERATION ACTIONS
====================================================== */
router.put("/:id/approve", approveBusiness);
router.put("/:id/reject", rejectBusiness);
router.put("/:id/feature", toggleFeatured);
router.put("/:id/verify", toggleVerifiedBusiness);

/* ======================================================
   DELETE BUSINESS
====================================================== */
router.delete("/:id", deleteBusinessAdmin);

export default router;