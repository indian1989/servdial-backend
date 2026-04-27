// backend/routes/homepageRoutes.js
import express from "express";
import { getHomepageData } from "../controllers/homepageController.js";

console.log("✅ Homepage routes loaded");
console.log("📦 homepageRoutes file executed");

const router = express.Router();

router.get("/", getHomepageData);

export default router;