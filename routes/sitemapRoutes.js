import express from "express";
import {
  sitemapIndex,
  staticSitemap,
  citySitemap,
  categorySitemap,
  serviceCitySitemap,
  businessSitemap
} from "../controllers/sitemapController.js";

const router = express.Router();

router.get("/sitemap.xml", sitemapIndex);
router.get("/sitemap-static.xml", staticSitemap);
router.get("/sitemap-cities.xml", citySitemap);
router.get("/sitemap-categories.xml", categorySitemap);
router.get("/sitemap-services.xml", serviceCitySitemap);

// FIX 1: add fallback (IMPORTANT)
router.get("/sitemap-businesses.xml", (req, res) => {
  req.params.page = 1;
  businessSitemap(req, res);
});

// pagination version
router.get("/sitemap-businesses-:page.xml", businessSitemap);

export default router;