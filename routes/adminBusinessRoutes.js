import express from "express";

import {
  getAllBusinessesAdmin,
  approveBusiness,
  rejectBusiness,
  deleteBusinessAdmin,
  toggleFeatured,
} from "../controllers/adminBusinessController.js";

import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

/*
ADMIN ROUTES
*/

router.get("/businesses", protect, getAllBusinessesAdmin);

router.put("/business/approve/:id", protect, approveBusiness);

router.put("/business/reject/:id", protect, rejectBusiness);

router.put("/business/feature/:id", protect, toggleFeatured);

router.delete("/business/:id", protect, deleteBusinessAdmin);

export default router;