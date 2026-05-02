import express from "express";
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";

import {
  addCity,
  getCities,
  updateCity,
  deleteCity,
  bulkUploadCities,
  getStates,
  getDistrictsByState,
  getCitiesByDistrict,
  getFeaturedCities,
  markCityAsFeatured,
  unmarkCityAsFeatured
} from "../controllers/cityController.js";

const router = express.Router();

/* ================= SECURITY LOCK ================= */
router.use(protect);
router.use(authorizeRoles("admin", "superadmin"));

/* ================= CORE CITY CRUD ================= */
router.post("/", addCity);
router.get("/", getCities);
router.put("/:id", updateCity);
router.delete("/:id", deleteCity);

/* ================= BULK OPERATIONS ================= */
router.post("/bulk-upload", bulkUploadCities);

/* ================= LOCATION STRUCTURE ================= */
router.get("/states", getStates);
router.get("/districts/:stateSlug", getDistrictsByState);
router.get("/cities/:districtSlug", getCitiesByDistrict);

/* ================= FEATURE SYSTEM ================= */
router.get("/featured", getFeaturedCities);
router.patch("/:id/feature", markCityAsFeatured);
router.patch("/:id/unfeature", unmarkCityAsFeatured);

export default router;