import express from "express";

import {
  registerUser,
  loginUser,
  getUserProfile,

  sendRegistrationOTP,
  verifyOTP,

  sendForgotPasswordOTP,
  verifyForgotPasswordOTP,
  resetPassword

} from "../controllers/authController.js";


import { protect } from "../middleware/authMiddleware.js";


const router = express.Router();


// ================= PUBLIC ROUTES =================


// Registration Email OTP
router.post(
  "/send-registration-otp",
  sendRegistrationOTP
);


// Verify OTP
router.post(
  "/verify-otp",
  verifyOTP
);


// Register
router.post(
  "/register",
  registerUser
);


// Login
router.post(
  "/login",
  loginUser
);



// ================= FORGOT PASSWORD =================


// Step 1
// Email -> Send OTP
router.post(
  "/send-forgot-password-otp",
  sendForgotPasswordOTP
);


// Step 2
// Verify OTP
router.post(
  "/verify-forgot-password-otp",
  verifyForgotPasswordOTP
);


// Step 3
// Update Password
router.post(
  "/reset-password",
  resetPassword
);




// ================= PROTECTED ROUTES =================

router.get(
  "/profile",
  protect,
  getUserProfile
);



export default router;