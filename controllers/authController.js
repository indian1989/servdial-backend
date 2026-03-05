// backend/controllers/authController.js
import asyncHandler from "express-async-handler";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import nodemailer from "nodemailer";
import User from "../models/User.js";

// ================= Helper – Generate JWT =================
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
};

// ================= REGISTER USER =================
export const registerUser = asyncHandler(async (req, res) => {
  let { name, email, phone, password, role = "user" } = req.body;

  if (!name || !email || !password) {
    res.status(400);
    throw new Error("Please provide name, email, and password");
  }

  email = email.trim().toLowerCase();

  const userExists = await User.findOne({
    $or: [{ email }, { phone }],
  });

  if (userExists) {
    res.status(400);
    throw new Error("User with this email or phone already exists");
  }

  const hashedPassword = await bcrypt.hash(password.trim(), 10);

  const user = await User.create({
    name: name.trim(),
    email,
    phone,
    password: hashedPassword,
    role,
  });

  res.status(201).json({
    success: true,
    message: "User registered successfully",
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
    },
    token: generateToken(user._id),
  });
});

// ================= LOGIN USER =================
export const loginUser = asyncHandler(async (req, res) => {
  let { emailOrPhone, password } = req.body;

  if (!emailOrPhone || !password) {
    res.status(400);
    throw new Error("Please provide email/phone and password");
  }

  emailOrPhone = emailOrPhone.trim().toLowerCase();
  password = password.trim();

  const user = await User.findOne({
    $or: [{ email: emailOrPhone }, { phone: emailOrPhone }],
  }).select("+password");

  if (!user) {
    res.status(401);
    throw new Error("User not found");
  }

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    res.status(401);
    throw new Error("Invalid credentials");
  }

  res.status(200).json({
    success: true,
    message: "Login successful",
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
    },
    token: generateToken(user._id),
  });
});

// ================= FORGOT PASSWORD =================
export const forgotPassword = asyncHandler(async (req, res) => {
  let { email } = req.body;
  if (!email) {
    res.status(400);
    throw new Error("Please provide email");
  }
  email = email.trim().toLowerCase();

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(200).json({ message: "If email exists, reset link sent" });
  }

  const resetToken = crypto.randomBytes(32).toString("hex");
  user.resetPasswordToken = resetToken;
  user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 mins
  await user.save();

  const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const message = `
    You requested a password reset.

    Click this link to reset your password:
    ${resetUrl}

    This link will expire in 10 minutes.
  `;

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: user.email,
    subject: "ServDial Password Reset",
    text: message,
  });

  res.status(200).json({ message: "Reset link sent to email" });
});

// ================= RESET PASSWORD =================
export const resetPassword = asyncHandler(async (req, res) => {
  const { token } = req.params;
  let { password } = req.body;

  if (!password) {
    res.status(400);
    throw new Error("Please provide new password");
  }
  password = password.trim();

  const user = await User.findOne({
    resetPasswordToken: token,
    resetPasswordExpire: { $gt: Date.now() },
  });

  if (!user) {
    res.status(400);
    throw new Error("Invalid or expired token");
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  user.password = hashedPassword;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();

  res.status(200).json({ message: "Password reset successful" });
});

// ================= GET USER PROFILE =================
export const getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select("-password");

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  res.status(200).json({ success: true, user });
});