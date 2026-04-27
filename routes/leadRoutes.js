import express from "express";
import {
  createLead,
  getBusinessLeads,
  getAllLeads
} from "../controllers/leadController.js";

import { protect, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

/* ===============================
   CREATE LEAD (PUBLIC)
================================ */
router.post("/", createLead);

/* ===============================
   BUSINESS OWNER LEADS
================================ */
router.get(
  "/business/:businessId",
  protect,
  authorizeRoles("admin", "superadmin", "provider"),
  getBusinessLeads
);

/* ===============================
   ADMIN LEADS ONLY
================================ */
router.get(
  "/",
  protect,
  authorizeRoles("admin", "superadmin"),
  getAllLeads
);

export default router;