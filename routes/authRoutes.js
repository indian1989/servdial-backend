import express from "express";
import {
  registerUser,
  loginUser,
  getUserProfile,
  forgotPassword,
  resetPassword,
  sendRegistrationOTP,
  sendPhoneVerificationOTP,
  verifyOTP,
} from "../controllers/authController.js";

import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Email OTP
router.post("/send-registration-otp", sendRegistrationOTP);

// Phone OTP
router.post("/send-phone-otp", sendPhoneVerificationOTP);

// ================= PUBLIC ROUTES =================
router.post("/verify-otp", verifyOTP);
router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);

// ================= PROTECTED ROUTES =================
router.get("/profile", protect, getUserProfile);

export default router;
