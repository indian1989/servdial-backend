// backend/routes/adminCityRoutes.js
import express from "express";
import {
  addCity,
  updateCity,
  deleteCity,
  markCityAsFeatured,
  unmarkCityAsFeatured,
  bulkUploadCities,
} from "../controllers/cityController.js";

import { protect, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);
router.use(authorizeRoles("admin", "superadmin"));

router.post("/", addCity);
router.post("/bulk", bulkUploadCities);
router.put("/:id", updateCity);
router.delete("/:id", deleteCity);

router.put("/:id/feature", markCityAsFeatured);
router.put("/:id/unfeature", unmarkCityAsFeatured);

export default router;