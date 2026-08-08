// backend/routes/userRoutes.js
import express from "express";
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";
import {
    createAdmin,
    changePassword,
    saveBusiness,
    checkSavedBusiness,
    removeSavedBusiness,
    getSavedBusinesses
} from "../controllers/userController.js";


const router = express.Router();

// Change password (any authenticated user)
router.put("/change-password", protect, changePassword);

// Create admin (only superadmin)
router.post("/create-admin", protect, authorizeRoles("superadmin"), createAdmin);

// save business
router.post(
"/save-business",
protect,
saveBusiness
);

router.get(
"/check-saved/:businessId",
protect,
checkSavedBusiness
);

// remove saved
router.post(
"/remove-saved-business",
protect,
removeSavedBusiness
);


// get saved list
router.get(
"/saved-businesses",
protect,
getSavedBusinesses
);


export default router;