import express from "express";
import {
  createLead,
  getBusinessLeads,
  getAllLeads
} from "../controllers/leadController.js";

import { protect } from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";

const router = express.Router();

// Create lead (public)
router.post("/", createLead);

// Business owner leads
router.get("/business/:businessId", protect, getBusinessLeads);

// Admin leads
router.get("/", protect, roleMiddleware("admin"), getAllLeads);

export default router;