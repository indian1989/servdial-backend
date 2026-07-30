// backend/routes/sitemapRoutes.js

import express from "express";

import {
  sitemapIndex,
  staticSitemap,
  citySitemap,
  categorySitemap,
  cityCategorySitemap,
  businessSitemap
} from "../controllers/sitemapController.js";


const router = express.Router();



// =================================================
// MAIN SITEMAP INDEX
// =================================================

router.get(
  "/sitemap.xml",
  sitemapIndex
);




// =================================================
// STATIC PAGES
// =================================================

router.get(
  "/sitemap-static.xml",
  staticSitemap
);




// =================================================
// CITY SITEMAPS
// =================================================

router.get(
  "/sitemap-cities.xml",
  citySitemap
);


router.get(
  "/sitemap-cities-:page(\\d+).xml",
  citySitemap
);




// =================================================
// CATEGORY SITEMAPS
// =================================================

router.get(
  "/sitemap-categories.xml",
  categorySitemap
);


router.get(
  "/sitemap-categories-:page(\\d+).xml",
  categorySitemap
);




// =================================================
// CITY CATEGORY SEO PAGES
// =================================================

router.get(
  "/sitemap-city-category.xml",
  cityCategorySitemap
);


router.get(
  "/sitemap-city-category-:page(\\d+).xml",
  cityCategorySitemap
);




// =================================================
// BUSINESS SITEMAPS
// =================================================

router.get(
  "/sitemap-businesses.xml",
  businessSitemap
);


router.get(
  "/sitemap-businesses-:page(\\d+).xml",
  businessSitemap
);



export default router;