import express from "express";
import { getCities,
    addCity,
    bulkUploadCities,
    updateCity,
    deleteCity,
    getStates,
    getDistrictsByState,
    getCitiesByDistrict,
    getFeaturedCities,
    markCityAsFeatured,
    unmarkCityAsFeatured
} from "../controllers/cityController.js";
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

/* GET ALL CITIES */
router.get("/", getCities);
router.get("/states", getStates);
router.get("/districts/:stateSlug", getDistrictsByState);
router.get("/by-district/:districtSlug", getCitiesByDistrict);

/* ADD CITY */
router.post("/", addCity);

// ✅ BULK UPLOAD
router.post("/bulk", bulkUploadCities);

/* ================= UPDATE CITY ================= */
router.put("/:id", updateCity);

/* ================= DELETE CITY ================= */
router.delete("/:id", deleteCity);

/* GET FEATURED CITIES */
router.get("/featured", getFeaturedCities);

/* MARK CITY AS FEATURED */
router.put(
  "/feature/:id",
  protect,
  authorizeRoles("admin", "superadmin"),
  markCityAsFeatured
);

/* UNMARK CITY AS FEATURED */
router.put(
  "/unfeature/:id",
  protect,
  authorizeRoles("admin", "superadmin"),
  unmarkCityAsFeatured
);
export default router;