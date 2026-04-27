import mongoose from "mongoose";

/* ===============================
   CUSTOM ERROR CLASS
================================ */
export class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.success = false;
  }
}

/* ===============================
   404 NOT FOUND
================================ */
export const notFound = (req, res, next) => {
  const error = new Error(`Route not found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

/* ===============================
   GLOBAL ERROR HANDLER
================================ */
export const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || res.statusCode || 500;
  let message = err.message;

  // ================= MONGOOSE CAST ERROR =================
  if (err instanceof mongoose.Error.CastError) {
    statusCode = 400;
    message = `Invalid ID format: ${err.value}`;
  }

  // ================= VALIDATION ERROR =================
  if (err instanceof mongoose.Error.ValidationError) {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((val) => val.message)
      .join(", ");
  }

  // ================= DUPLICATE KEY ERROR =================
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue).join(", ");
    message = `Duplicate field value: ${field}`;
  }

  // ================= JWT ERRORS =================
  if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid token";
  }

  if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Token expired";
  }

  res.status(statusCode).json({
    success: false,
    message,
    stack: process.env.NODE_ENV !== "production" ? err.stack : undefined,
  });
};