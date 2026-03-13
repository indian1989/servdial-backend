import express from "express";
import {
  createReview,
  getBusinessReviews
} from "../controllers/reviewController.js";

const router = express.Router();

router.post("/", createReview);

router.get("/business/:businessId", getBusinessReviews);

export default router;