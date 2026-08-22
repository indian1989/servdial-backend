// backend/controllers/business/businessDiscoveryController.js

import asyncHandler from "express-async-handler";

import Business from "../../models/Business.js";
import City from "../../models/City.js";

import { rankBusinesses } from "../../services/ranking/unifiedRankingEngine.js";


/* =========================================================
   CORE VALIDATION
========================================================= */

import mongoose from "mongoose";

const isValidObjectId = (id) =>
  mongoose.Types.ObjectId.isValid(id);


/* =========================================================
   GET SIMILAR BUSINESSES
========================================================= */

export const getSimilarBusinesses = asyncHandler(
  async (req, res) => {

    const { id } = req.params;


    /* =====================================================
       VALIDATE ID
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
       LOAD BASE BUSINESS
    ===================================================== */

    const base =
      await Business.findById(id)
        .select(
          "location cityId categoryId"
        )
        .lean();


    if (!base) {

      return res.status(404).json({

        success: false,

        message:
          "Base business not found",

      });

    }


    /* =====================================================
       GEO QUERY
    ===================================================== */

    const nearby =
      await Business.aggregate([

        {
          $geoNear: {

            near: {

              type:
                "Point",

              coordinates:
                base.location.coordinates,

            },

            distanceField:
              "distanceMeters",

            spherical:
              true,

            query: {

              _id: {
                $ne:
                  base._id,
              },

              cityId:
                base.cityId,

              categoryId:
                base.categoryId,

              status:
                "approved",

              isDeleted:
                false,

            },

          },

        },


        {
          $limit:
            20,
        },


        {
          $lookup: {

            from:
              "cities",

            localField:
              "cityId",

            foreignField:
              "_id",

            as:
              "cityId",

          },

        },


        {
          $unwind: {

            path:
              "$cityId",

            preserveNullAndEmptyArrays:
              true,

          },

        },


        {
          $lookup: {

            from:
              "categories",

            localField:
              "categoryId",

            foreignField:
              "_id",

            as:
              "categoryId",

          },

        },


        {
          $unwind: {

            path:
              "$categoryId",

            preserveNullAndEmptyArrays:
              true,

          },

        },

      ]);


    /* =====================================================
       NORMALIZE
    ===================================================== */

    const normalized =
      nearby.map(
        (b) => ({

          ...b,

          distance:
            Number(
              (
                b.distanceMeters /
                1000
              ).toFixed(1)
            ),

          cityName:
            b.cityName ||
            b.cityId?.name ||
            "",

          citySlug:
            b.citySlug ||
            b.cityId?.slug ||
            "",

          categoryName:
            b.categoryName ||
            b.categoryId?.name ||
            "General",

          categorySlug:
            b.categorySlug ||
            b.categoryId?.slug ||
            "",

        })
      );


    /* =====================================================
       RANK
    ===================================================== */

    const ranked =
      rankBusinesses(

        normalized,

        {
          intent: {
            type:
              "similar",
          },
        }

      );


    /* =====================================================
       RESPONSE
    ===================================================== */

    return res.json({

      success:
        true,

      data:
        ranked.slice(0, 8),

    });

  }
);


/* =========================================================
   GET LATEST BUSINESSES
========================================================= */

export const getLatestBusinesses =
  asyncHandler(
    async (req, res) => {

      const {
        city,
        limit = 12,
      } = req.query;


      /* ===================================================
         BASE FILTER
      =================================================== */

      const filter = {

        status:
          "approved",

        isDeleted:
          false,

      };


      /* ===================================================
         CITY FILTER
      =================================================== */

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

          filter.cityId =
            cityDoc._id;

        }

      }


      /* ===================================================
         FETCH
      =================================================== */

      const businesses =
        await Business.find(
          filter
        )

        .populate(
          "cityId",
          "name slug"
        )

        .populate(
          "categoryId",
          "name slug uiType features"
        )

        .sort({
          createdAt:
            -1,
        })

        .limit(
          Number(limit)
        )

        .lean();


      /* ===================================================
         RESPONSE
      =================================================== */

      return res.json({

        success:
          true,

        data:
          businesses,

      });

    }
  );


/* =========================================================
   DEFAULT EXPORT
========================================================= */

export default {

  getSimilarBusinesses,

  getLatestBusinesses,

};