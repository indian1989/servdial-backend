// backend/routes/cityRoutes.js
import express from "express";
import {
  getCities,
  getStates,
  getDistrictsByState,
  getCitiesByDistrict,
} from "../controllers/cityController.js";

const router = express.Router();

router.get("/", getCities);
router.get("/states", getStates);
router.get("/districts/:stateSlug", getDistrictsByState);
router.get("/by-district/:districtSlug", getCitiesByDistrict);

export default router;