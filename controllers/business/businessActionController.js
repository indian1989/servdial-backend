// backend/controllers/business/businessActionController.js

import asyncHandler from "express-async-handler";

import Business from "../../models/Business.js";
import { normalizeBusinessHours } from "../../utils/normalizeBusinessHours.js";


/* =========================================================
   UPDATE BUSINESS HOURS
   PROVIDER
========================================================= */

export const updateBusinessHours = asyncHandler(
  async (req, res) => {

    const {
      businessId,
      businessHours,
    } = req.body;


    const userId =
      req.user?._id;


    /* =====================================================
       VALIDATION
    ===================================================== */

    if (
      !businessId ||
      !businessHours
    ) {

      return res.status(400).json({

        success: false,

        message:
          "Business ID and businessHours required",

      });

    }


    /* =====================================================
       LOAD BUSINESS
    ===================================================== */

    const business =
      await Business.findById(
        businessId
      );


    if (!business) {

      return res.status(404).json({

        success: false,

        message:
          "Business not found",

      });

    }


    /* =====================================================
       OWNERSHIP CHECK
    ===================================================== */

    if (
      String(
        business.owner
      ) !==
      String(
        userId
      )
    ) {

      return res.status(403).json({

        success: false,

        message:
          "Unauthorized access",

      });

    }


    /* =====================================================
       NORMALIZE HOURS
    ===================================================== */

    business.businessHours =
      normalizeBusinessHours({

        ...business.businessHours,

        ...businessHours,

      });


    /* =====================================================
       SAVE
    ===================================================== */

    await business.save();


    /* =====================================================
       RESPONSE
    ===================================================== */

    return res.json({

      success: true,

      message:
        "Business hours updated successfully",

      data:
        business.businessHours,

    });

  }
);


/* =========================================================
   CLAIM BUSINESS
========================================================= */

export const claimBusiness = asyncHandler(
  async (req, res) => {

    const businessId =
      req.params.id;


    const userId =
      req.user?._id;


    /* =====================================================
       AUTHENTICATION
    ===================================================== */

    if (!userId) {

      return res.status(401).json({

        success: false,

        message:
          "Login required",

      });

    }


    /* =====================================================
       LOAD BUSINESS
    ===================================================== */

    const business =
      await Business.findById(
        businessId
      );


    if (!business) {

      return res.status(404).json({

        success: false,

        message:
          "Business not found",

      });

    }


    /* =====================================================
       ALREADY CLAIMED
    ===================================================== */

    if (
      business.isClaimed
    ) {

      return res.status(400).json({

        success: false,

        message:
          "Business already claimed",

      });

    }


    /* =====================================================
       SUBMIT CLAIM
    ===================================================== */

    business.claimedBy =
      userId;

    business.claimStatus =
      "pending";

    business.isClaimed =
      false;


    await business.save();


    /* =====================================================
       RESPONSE
    ===================================================== */

    return res.json({

      success: true,

      message:
        "Business claim submitted for approval",

      data:
        business,

    });

  }
);