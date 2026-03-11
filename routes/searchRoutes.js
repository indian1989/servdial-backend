import express from "express";
import { searchBusinesses } from "../controllers/searchController.js";

const router = express.Router();

// Search businesses
router.get("/", searchBusinesses);

export default router;