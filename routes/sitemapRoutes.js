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

/* ================= INDEX ================= */
router.get("/sitemap.xml", sitemapIndex);

/* ================= STATIC ================= */
router.get("/sitemap-static.xml", staticSitemap);

/* ================= CITY (BASE + PAGINATION) ================= */
router.get("/sitemap-cities.xml", citySitemap);
router.get("/sitemap-cities-:page.xml", citySitemap);

/* ================= CATEGORY (BASE + PAGINATION) ================= */
router.get("/sitemap-categories.xml", categorySitemap);
router.get("/sitemap-categories-:page.xml", categorySitemap);

/* ================= CITY + CATEGORY ================= */
router.get("/sitemap-city-category.xml", cityCategorySitemap);
router.get("/sitemap-city-category-:page.xml", cityCategorySitemap);

/* ================= BUSINESS ================= */
router.get("/sitemap-businesses.xml", businessSitemap);
router.get("/sitemap-businesses-:page.xml", businessSitemap);

export default router;