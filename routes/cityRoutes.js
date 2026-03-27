import express from "express";
import { getCities,
    addCity,
    updateCity,
    deleteCity,
    getFeaturedCities,
    markCityAsFeatured,
    unmarkCityAsFeatured
} from "../controllers/cityController.js";
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

/* GET ALL CITIES */
router.get("/", getCities);

/* ADD CITY */
router.post("/", addCity);

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