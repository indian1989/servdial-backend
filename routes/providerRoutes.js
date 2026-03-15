import express from "express";
import { getProviderBusinesses } from "../controllers/providerController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

/* ================================
   PROVIDER BUSINESSES
================================ */

router.get("/business/provider", protect, getProviderBusinesses);

export default router;