// backend/controllers/business/businessReadController.js

import asyncHandler from "express-async-handler";
import mongoose from "mongoose";

import Business from "../../models/Business.js";
import City from "../../models/City.js";
import Category from "../../models/Category.js";


/* =========================================================
   GET BUSINESSES
========================================================= */

export const getBusinesses = asyncHandler(
  async (req, res) => {

    const {
      city,
      category,
      page = 1,
      limit = 20,
    } = req.query;


    /* =====================================================
       BASE QUERY
    ===================================================== */

    const query = {

      status:
        "approved",

      isDeleted:
        false,

    };


    /* =====================================================
       CITY FILTER
    ===================================================== */

    if (city) {

      const cityDoc =
        await City.findOne({

          slug:
            city,

          status:
            "active",

        })
        .select("_id");


      if (cityDoc) {

        query.cityId =
          cityDoc._id;

      }

    }


    /* =====================================================
       CATEGORY FILTER
    ===================================================== */

    if (category) {

      const categoryDoc =
        await Category.findOne({

          slug:
            category,

          status:
            "active",

        })
        .select("_id");


      if (categoryDoc) {

        query.categoryId =
          categoryDoc._id;

      }

    }


    /* =====================================================
       PAGINATION
    ===================================================== */

    const skip =
      (
        Number(page) - 1
      ) *
      Number(limit);


    /* =====================================================
       FETCH
    ===================================================== */

    const [
      businesses,
      total,
    ] =
      await Promise.all([

        Business.find(query)

          .select(
            "+location"
          )

          .populate(
            "cityId",
            "name slug district state country latitude longitude"
          )

          .populate(
            "categoryId",
            "name slug uiType features"
          )

          .sort({
            createdAt:
              -1,
          })

          .skip(
            skip
          )

          .limit(
            Number(limit)
          )

          .lean(),


        Business.countDocuments(
          query
        ),

      ]);


    /* =====================================================
       RESPONSE
    ===================================================== */

    return res.json({

      success:
        true,

      data:
        businesses,

      meta: {

        total,

        page:
          Number(page),

        limit:
          Number(limit),

        pages:
          Math.ceil(
            total /
            Number(limit)
          ),

      },

    });

  }
);


/* =========================================================
   GET SINGLE BUSINESS BY ID
========================================================= */

export const getBusinessById = asyncHandler(
  async (req, res) => {

    const {
      id,
    } = req.params;


    /* =====================================================
       VALIDATE ID
    ===================================================== */

    if (
      !mongoose.Types.ObjectId.isValid(id)
    ) {

      return res.status(400).json({

        success:
          false,

        message:
          "Invalid business id",

      });

    }


    /* =====================================================
       FETCH BUSINESS
    ===================================================== */

    const business =
      await Business.findById(
        id
      )

        .populate(
          "cityId"
        )

        .populate(
          "categoryId"
        );


    /* =====================================================
       NOT FOUND
    ===================================================== */

    if (
      !business
    ) {

      return res.status(404).json({

        success:
          false,

        message:
          "Business not found",

      });

    }


    /* =====================================================
       RESPONSE
    ===================================================== */

    return res.json({

      success:
        true,

      data:
        business,

    });

  }
);