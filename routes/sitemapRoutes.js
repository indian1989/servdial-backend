// backend/routes/sitemapRoutes.js

import express from "express";

import {
  sitemapIndex,
  staticSitemap,
  stateSitemap,
  citySitemap,
  temporaryListingSitemap,
  categorySitemap,
  cityCategorySitemap,
  cityPagesSitemap,
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


router.get("/sitemap-states.xml", stateSitemap);
router.get("/sitemap-states-:page(\\d+).xml", stateSitemap);

router.get(
  "/sitemap-temporary-listings.xml",
  temporaryListingSitemap
);

router.get(
  "/sitemap-temporary-listings-:page(\\d+).xml",
  temporaryListingSitemap
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
// CITY DEDICATED PAGES
// =================================================

router.get(
  "/sitemap-city-pages.xml",
  cityPagesSitemap
);

router.get(
  "/sitemap-city-pages-:page(\\d+).xml",
  cityPagesSitemap
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