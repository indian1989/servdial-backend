import express from "express";
import { getCities,
    addCity,
    getFeaturedCities,
    markCityAsFeatured,
    unmarkCityAsFeatured
} from "../controllers/cityController.js";

const router = express.Router();

/* GET ALL CITIES */
router.get("/", getCities);

/* ADD CITY */
router.post("/", addCity);

/* GET FEATURED CITIES */
router.get("/featured", getFeaturedCities);

/* MARK CITY AS FEATURED */
router.put(
  "/feature/:id",
  protect,
  authorize("admin", "superadmin"),
  markCityAsFeatured
);

/* UNMARK CITY AS FEATURED */
router.put(
  "/unfeature/:id",
  protect,
  authorize("admin", "superadmin"),
  unmarkCityAsFeatured
);
export default router;