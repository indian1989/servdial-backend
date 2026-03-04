import express from "express";
import { forgotPassword, resetPassword } from "../controllers/authController.js";
import {
  registerUser,
  loginUser,
  getUserProfile,
} from "../controllers/authController.js";

import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// ================= PUBLIC ROUTES =================
router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);

// ================= PROTECTED ROUTES =================
router.get("/profile", protect, getUserProfile);

export default router;