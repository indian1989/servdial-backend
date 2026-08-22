// backend/controllers/business/businessAnalyticsController.js

import asyncHandler from "express-async-handler";
import mongoose from "mongoose";

import Business from "../../models/Business.js";


/* =========================================================
   CORE VALIDATION
========================================================= */

const isValidObjectId = (id) =>
  mongoose.Types.ObjectId.isValid(id);


/* =========================================================
   TRACK BUSINESS VIEW
========================================================= */

export const trackBusinessView = asyncHandler(
  async (req, res) => {

    const {
      id,
    } = req.params;


    /* =====================================================
       VALIDATE BUSINESS ID
    ===================================================== */

    if (
      !isValidObjectId(id)
    ) {

      return res.status(400).json({

        success: false,

        message:
          "Invalid business id",

      });

    }


    /* =====================================================
       INCREMENT VIEW
    ===================================================== */

    await Business.findByIdAndUpdate(

      id,

      {

        $inc: {
          views: 1,
        },

        $set: {
          lastViewedAt:
            new Date(),
        },

      },

      {
        new: false,
      }

    );


    /* =====================================================
       RESPONSE
    ===================================================== */

    return res.json({

      success: true,

      data: null,

    });

  }
);


/* =========================================================
   TRACK BUSINESS ANALYTICS
========================================================= */

export const trackBusinessAnalytics =
  asyncHandler(
    async (req, res) => {

      const {
        id,
      } = req.params;


      const {
        type,
      } = req.body;


      /* ===================================================
         VALIDATE BUSINESS ID
      =================================================== */

      if (
        !isValidObjectId(id)
      ) {

        return res.status(400).json({

          success: false,

          message:
            "Invalid business id",

        });

      }


      /* ===================================================
         ANALYTICS FIELD MAP
      =================================================== */

      const fieldMap = {

        call:
          "phoneClicks",

        whatsapp:
          "whatsappClicks",

        direction:
          "directionClicks",

        share:
          "shareClicks",

        booking:
          "bookingClicks",

      };


      const field =
        fieldMap[type];


      /* ===================================================
         VALIDATE ANALYTICS TYPE
      =================================================== */

      if (!field) {

        return res.status(400).json({

          success: false,

          message:
            "Invalid analytics type",

        });

      }


      /* ===================================================
         INCREMENT ANALYTICS
      =================================================== */

      await Business.findByIdAndUpdate(

        id,

        {

          $inc: {
            [field]: 1,
          },

        },

        {
          new: false,
        }

      );


      /* ===================================================
         RESPONSE
      =================================================== */

      return res.json({

        success: true,

        data: null,

      });

    }
  );


/* =========================================================
   DEFAULT EXPORT
========================================================= */

export default {
  trackBusinessView,
  trackBusinessAnalytics,
};