// backend/models/Reports.js

import mongoose from "mongoose";

const reportsSchema = new mongoose.Schema(
  {
    reportType: {
      type: String,
      required: true,
      enum: ["business", "user", "transaction", "other"],
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "resolved", "ignored"],
      default: "pending",
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

const Reports = mongoose.model("Reports", reportsSchema);

export default Reports;