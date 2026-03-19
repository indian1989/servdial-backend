import express from "express";
import { generateCityCategoryPages } from "../controllers/seoController.js";

const router = express.Router();

router.get("/seo-pages", generateCityCategoryPages);

export default router;