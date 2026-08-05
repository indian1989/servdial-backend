// backend/models/OtpVerification.js

import mongoose from "mongoose";


const otpVerificationSchema = new mongoose.Schema(
{
  // Email OTP ke liye
  email: {
    type: String,
    lowercase: true,
    trim: true,
    index: true,
    sparse: true
  },


  // Phone OTP ke liye
  phone: {
    type: String,
    trim: true,
    index: true,
    sparse: true
  },


  otp: {
    type: String,
    required: true
  },


  type: {
    type: String,
    enum: [
      "email_verification",
      "phone_verification",
      "login_otp",
      "password_reset"
    ],
    default: "email_verification"
  },


  expiresAt: {
    type: Date,
    required: true
  }

},
{
  timestamps: true
});


// Auto delete expired OTP
otpVerificationSchema.index(
  { expiresAt: 1 },
  {
    expireAfterSeconds: 0
  }
);


export default mongoose.model(
  "OtpVerification",
  otpVerificationSchema
);