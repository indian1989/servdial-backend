import express from "express";

import {
  createTemporaryListing,
  getAllTemporaryListings,
  getPublicTemporaryListings,
  getTemporaryListing,
  getProviderTemporaryListings,
  updateTemporaryListing,
  approveTemporaryListing,
  rejectTemporaryListing,
  deleteTemporaryListing,
} from "../controllers/temporaryListing/TemporaryListingController.js";

import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();


/* ======================================================
   PUBLIC
====================================================== */

router.get(
  "/",
  getPublicTemporaryListings
);


/* ======================================================
   PROVIDER
====================================================== */

router.get(
  "/provider/my-listings",
  protect,
  getProviderTemporaryListings
);

router.post(
  "/",
  protect,
  createTemporaryListing
);


/* ======================================================
   ADMIN
====================================================== */

router.get(
  "/admin/all",
  protect,
  getAllTemporaryListings
);

router.put(
  "/admin/:id/approve",
  protect,
  approveTemporaryListing
);

router.put(
  "/admin/:id/reject",
  protect,
  rejectTemporaryListing
);


/* ======================================================
   COMMON
====================================================== */

router.put(
  "/:id",
  protect,
  updateTemporaryListing
);

router.delete(
  "/:id",
  protect,
  deleteTemporaryListing
);

router.get(
  "/:id",
  getTemporaryListing
);


export default router;