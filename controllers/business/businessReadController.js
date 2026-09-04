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

/* =========================================================
   GET RANDOM CITY BUSINESSES
   - Approved businesses only
   - Non-deleted only
   - City specific
   - Random category/business mix
   - Optimized: single aggregation pipeline
========================================================= */

export const getRandomCityBusinesses = asyncHandler(
  async (req, res) => {
    const {
      city,
      limit = 20,
    } = req.query;

    const safeLimit = Math.min(
      Math.max(Number(limit) || 20, 1),
      50
    );

    const query = {
      status: "approved",
      isDeleted: false,
    };

    /* =========================
       CITY FILTER
    ========================= */

    if (city) {
      const cityDoc =
        await City.findOne({
          slug: String(city).toLowerCase(),
          status: "active",
        }).select("_id").lean();

      if (!cityDoc) {
        return res.json({
          success: true,
          data: [],
          meta: {
            total: 0,
            city,
            limit: safeLimit,
          },
        });
      }

      query.cityId = cityDoc._id;
    }

    /* =========================
       RANDOM BUSINESSES
       + CITY
       + CATEGORY
       IN ONE PIPELINE
    ========================= */

    const businesses =
      await Business.aggregate([
        {
          $match: query,
        },

        {
          $sample: {
            size: safeLimit,
          },
        },

        /* =========================
           CITY
        ========================= */

        {
          $lookup: {
            from: "cities",
            let: {
              cityId: "$cityId",
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $eq: [
                      "$_id",
                      "$$cityId",
                    ],
                  },
                },
              },
              {
                $project: {
                  name: 1,
                  slug: 1,
                  district: 1,
                  state: 1,
                  country: 1,
                  latitude: 1,
                  longitude: 1,
                },
              },
            ],
            as: "cityData",
          },
        },

        /* =========================
           CATEGORY
        ========================= */

        {
          $lookup: {
            from: "categories",
            let: {
              categoryId: "$categoryId",
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $eq: [
                      "$_id",
                      "$$categoryId",
                    ],
                  },
                },
              },
              {
                $project: {
                  name: 1,
                  slug: 1,
                  uiType: 1,
                  features: 1,
                },
              },
            ],
            as: "categoryData",
          },
        },

        /* =========================
           KEEP SAME SHAPE AS
           MONGOOSE POPULATE()
        ========================= */

        {
          $set: {
            cityId: {
              $arrayElemAt: [
                "$cityData",
                0,
              ],
            },
            categoryId: {
              $arrayElemAt: [
                "$categoryData",
                0,
              ],
            },
          },
        },

        {
          $project: {
            cityData: 0,
            categoryData: 0,
          },
        },
      ]);

    return res.json({
      success: true,
      data: businesses,
      meta: {
        total: businesses.length,
        city: city || null,
        limit: safeLimit,
      },
    });
  }
);