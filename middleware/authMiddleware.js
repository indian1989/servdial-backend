// backend/middleware/authMiddleware.js
import jwt from "jsonwebtoken";
import asyncHandler from "express-async-handler";
import User from "../models/User.js";

/* ===============================
   PROTECT ROUTE (JWT VERIFY)
================================ */
export const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      // Extract token
      token = req.headers.authorization.split(" ")[1];

      if (!process.env.JWT_SECRET) {
        throw new Error("JWT_SECRET not configured");
      }

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user without password
      const user = await User.findById(decoded.id).select("-password");

      if (!user) {
        res.status(401);
        throw new Error("User no longer exists");
      }

      req.user = user;

      next();

    } catch (error) {
      res.status(401);
      throw new Error("Not authorized, invalid token");
    }
  } else {
    res.status(401);
    throw new Error("Not authorized, no token provided");
  }
});

/* ===============================
   ROLE BASED AUTHORIZATION
================================ */
export const authorizeRoles = (...roles) => {
  return (req, res, next) => {

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Insufficient permission.",
      });
    }

    next();
  };
};