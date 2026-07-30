// backend/routes/seoRoutes.js

import express from "express";

import {
  generateCityCategoryPages,
  getCityCategoryPage,
} from "../controllers/seoController.js";


const router = express.Router();



/*
=================================================
 SEO ADMIN / GENERATION API
=================================================
*/

// Generate all city-category SEO URLs
router.get(
  "/seo-pages",
  generateCityCategoryPages
);



/*
=================================================
 PUBLIC SEO LANDING PAGE
=================================================
*/

// Example:
// /hajipur-vaishali-bihar/ac-repair-service

router.get(
  "/:citySlug/:categorySlug",
  getCityCategoryPage
);



export default router;