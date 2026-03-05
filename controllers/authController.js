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