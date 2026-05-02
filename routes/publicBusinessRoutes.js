import express from "express";

import {
  getBusinesses,
  getBusinessById,
} from "../controllers/businessController.js";

const router = express.Router();

/* ================================
   PUBLIC BUSINESS ROUTES (READ ONLY)
================================ */

// GET all businesses (search, filters applied in controller)
router.get("/", getBusinesses);

// GET single business details
router.get("/:id", getBusinessById);

export default router;