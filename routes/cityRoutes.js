import express from "express";
import { getCities, addCity } from "../controllers/cityController.js";

const router = express.Router();

/* GET ALL CITIES */
router.get("/", getCities);

/* ADD CITY */
router.post("/", addCity);

export default router;