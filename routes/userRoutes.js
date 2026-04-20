// backend/routes/userRoutes.js
import express from "express";
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";
import { createAdmin, changePassword } from "../controllers/userController.js";

const router = express.Router();

// Change password (any authenticated user)
router.put("/change-password", protect, changePassword);

// Create admin (only superadmin)
router.post("/create-admin", protect, authorizeRoles("superadmin"), createAdmin);


export default router;