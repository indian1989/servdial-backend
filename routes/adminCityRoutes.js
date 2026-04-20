// backend/routes/adminCityRoutes.js
import express from "express";
import {
  addCity,
  updateCity,
  deleteCity,
  markCityAsFeatured,
  unmarkCityAsFeatured,
} from "../controllers/cityController.js";

import { protect, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);
router.use(authorizeRoles("admin", "superadmin"));

router.post("/", addCity);
router.put("/:id", updateCity);
router.delete("/:id", deleteCity);

router.put("/feature/:id", markCityAsFeatured);
router.put("/unfeature/:id", unmarkCityAsFeatured);

export default router;