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
        page = 1,
        limit = 20,
      } = req.query;


      /* ===================================================
         PAGINATION
      =================================================== */

      const currentPage =
        Math.max(
          Number(page) || 1,
          1
        );

      const perPage =
        Math.min(
          Math.max(
            Number(limit) || 20,
            1
          ),
          50
        );


      const skip =
        (currentPage - 1) *
        perPage;


      /* ===================================================
         CITY RESOLUTION
      =================================================== */

      let cityDoc = null;
      let cityFilter = {};


      if (city) {

        cityDoc =
          await City.findOne({

            slug:
              String(city)
                .trim()
                .toLowerCase(),

            status:
              "active",

          })
          .select("_id name slug")
          .lean();


        if (
          !cityDoc &&
          String(city).trim().toLowerCase() !== "india"
        ) {

          return res.status(404).json({

            success: false,

            message:
              "City not found",

          });

        }


        if (cityDoc) {

          cityFilter.cityId =
            cityDoc._id;

        }

      }


      /* ===================================================
         BASE FILTER
      =================================================== */

      const filter = {

        status:
          "approved",

        isDeleted:
          false,

        ...cityFilter,

      };


      /* ===================================================
         TOTAL COUNT + DATA
      =================================================== */

      const [
        total,
        businesses,
      ] = await Promise.all([

        Business.countDocuments(
          filter
        ),

        Business.find(
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

          .skip(
            skip
          )

          .limit(
            perPage
          )

          .lean(),

      ]);


      /* ===================================================
         TOTAL PAGES
      =================================================== */

      const totalPages =
        Math.ceil(
          total /
          perPage
        );


      /* ===================================================
         RESPONSE
      =================================================== */

      return res.json({

        success:
          true,

        data:
          businesses,

        meta: {

          city:
            cityDoc
              ? {
                  name:
                    cityDoc.name,

                  slug:
                    cityDoc.slug,
                }
              : null,

          total,

          page:
            currentPage,

          limit:
            perPage,

          totalPages,

          hasNextPage:
            currentPage <
            totalPages,

          hasPrevPage:
            currentPage > 1,

        },

      });

    }
  );


/* =========================================================
   GET FEATURED BUSINESSES
========================================================= */

export const getFeaturedBusinesses =
  asyncHandler(
    async (req, res) => {

      const {
        city,
        lat,
        lng,
        page = 1,
        limit = 20,
      } = req.query;


      /* ===================================================
         PAGINATION
      =================================================== */

      const currentPage =
        Math.max(
          Number(page) || 1,
          1
        );

      const perPage =
        Math.min(
          Math.max(
            Number(limit) || 20,
            1
          ),
          50
        );

      const skip =
        (currentPage - 1) *
        perPage;


      /* ===================================================
         CITY RESOLUTION
      =================================================== */

      let cityDoc = null;
      let cityFilter = {};


      if (city) {

        cityDoc =
          await City.findOne({

            slug:
              String(city)
                .trim()
                .toLowerCase(),

            status:
              "active",

          })
          .select("_id name slug")
          .lean();


        if (
          !cityDoc &&
          city !== "india"
        ) {

          return res.status(404).json({

            success: false,

            message:
              "City not found",

          });

        }


        if (cityDoc) {

          cityFilter.cityId =
            cityDoc._id;

        }

      }


      /* ===================================================
         BASE FILTER
      =================================================== */

      const baseBusinessFilter = {

        status:
          "approved",

        isDeleted:
          false,

        isFeatured:
          true,

        ...cityFilter,

      };


      /* ===================================================
         TOTAL COUNT
      =================================================== */

      const total =
        await Business.countDocuments(
          baseBusinessFilter
        );


      const totalPages =
        Math.ceil(
          total / perPage
        );


      /* ===================================================
         SAFE LOCATION
      =================================================== */

      const safeLocation =
        lat &&
        lng
          ? {
              lat:
                Number(lat),

              lng:
                Number(lng),
            }
          : {};


      const safeContext = {
        intent:
          "homepage",
      };


      /* ===================================================
         SELECT
      =================================================== */

      const baseSelect = `

        name
        slug
        logo
        images
        address

        averageRating
        totalReviews

        views
        phoneClicks
        whatsappClicks

        phone
        landline
        whatsapp

        isFeatured
        featurePriority
        isVerified

        plan

        businessHours

        isTrustedPartner
        isPremiumPartner

        district
        state
        pincode

        citySlug
        categorySlug

        location
        createdAt

      `;


      /* ===================================================
         FETCH FEATURED PAGE
      =================================================== */

      const featuredRaw =
        await Business.find(
          baseBusinessFilter
        )

        .select(
          baseSelect
        )

        .populate(
          "cityId",
          "name slug"
        )

        .populate(
          "categoryId",
          "name slug"
        )

        .sort({

          featurePriority:
            -1,

          averageRating:
            -1,

          createdAt:
            -1,

        })

        .skip(
          skip
        )

        .limit(
          perPage
        )

        .lean();


      /* ===================================================
         RANK
      =================================================== */

      const rankedFeatured =
        await rankBusinesses(

          featuredRaw,

          safeLocation,

          "",

          safeContext,

          req.user?._id || null,

          cityDoc?._id || null

        );


      /* ===================================================
         RESPONSE
      =================================================== */

      return res.json({

        success:
          true,

        data:
          rankedFeatured,

        meta: {

          city:
            cityDoc
              ? {
                  name:
                    cityDoc.name,

                  slug:
                    cityDoc.slug,
                }
              : null,

          total,

          page:
            currentPage,

          limit:
            perPage,

          totalPages,

          hasNextPage:
            currentPage <
            totalPages,

          hasPrevPage:
            currentPage >
            1,

        },

      });

    }
  );

  /* =========================================================
   GET TOP RATED BUSINESSES
========================================================= */

export const getTopRatedBusinesses =
  asyncHandler(
    async (req, res) => {

      const {
        city,
        lat,
        lng,
        page = 1,
        limit = 20,
      } = req.query;


      /* ===================================================
         PAGINATION
      =================================================== */

      const currentPage =
        Math.max(
          Number(page) || 1,
          1
        );

      const perPage =
        Math.min(
          Math.max(
            Number(limit) || 20,
            1
          ),
          50
        );

      const skip =
        (currentPage - 1) * perPage;


      /* ===================================================
         CITY RESOLUTION
      =================================================== */

      let cityDoc = null;
      let cityFilter = {};


      if (city) {

        cityDoc =
          await City.findOne({

            slug:
              String(city)
                .trim()
                .toLowerCase(),

            status:
              "active",

          })
          .select("_id name slug")
          .lean();


        if (
          !cityDoc &&
          String(city).trim().toLowerCase() !== "india"
        ) {

          return res.status(404).json({

            success: false,

            message:
              "City not found",

          });

        }


        if (cityDoc) {

          cityFilter.cityId =
            cityDoc._id;

        }

      }


      /* ===================================================
         BASE FILTER
      =================================================== */

      const baseBusinessFilter = {

        status:
          "approved",

        isDeleted:
          false,

        ...cityFilter,

      };


      /* ===================================================
         SAFE LOCATION
      =================================================== */

      const safeLocation =
        lat &&
        lng
          ? {
              lat:
                Number(lat),

              lng:
                Number(lng),
            }
          : {};


      const safeContext = {
        intent:
          "homepage",
      };


      /* ===================================================
         SELECT
      =================================================== */

      const baseSelect = `

        name
        slug
        logo
        images
        address

        averageRating
        totalReviews

        views
        phoneClicks
        whatsappClicks

        phone
        landline
        whatsapp

        isFeatured
        featurePriority
        isVerified

        plan

        businessHours

        isTrustedPartner
        isPremiumPartner

        district
        state
        pincode

        citySlug
        categorySlug

        location
        createdAt

      `;


      /* ===================================================
         TOTAL COUNT
      =================================================== */

      const total =
        await Business.countDocuments(
          baseBusinessFilter
        );


      /* ===================================================
         FETCH TOP RATED
      =================================================== */

      const topRatedRaw =
        await Business.find(
          baseBusinessFilter
        )

        .select(
          baseSelect
        )

        .populate(
          "cityId",
          "name slug"
        )

        .populate(
          "categoryId",
          "name slug"
        )

        .sort({

          averageRating:
            -1,

          totalReviews:
            -1,

        })

        .skip(
          skip
        )

        .limit(
          perPage
        )

        .lean();


      /* ===================================================
         RANK
      =================================================== */

      const rankedTopRated =
        await rankBusinesses(

          topRatedRaw,

          safeLocation,

          "",

          safeContext,

          req.user?._id || null,

          cityDoc?._id || null

        );


      /* ===================================================
         RESPONSE
      =================================================== */

      return res.json({

        success:
          true,

        data:
          rankedTopRated,

        meta: {

          city:
            cityDoc
              ? {
                  name:
                    cityDoc.name,

                  slug:
                    cityDoc.slug,
                }
              : null,

          total,

          page:
            currentPage,

          limit:
            perPage,

          totalPages:
            Math.ceil(
              total /
              perPage
            ),

          hasNextPage:
            currentPage <
            Math.ceil(
              total /
              perPage
            ),

          hasPrevPage:
            currentPage > 1,

        },

      });

    }
  );

  
/* =========================================================
   GET NEARBY BUSINESSES
========================================================= */

export const getNearbyBusinesses =
  asyncHandler(
    async (req, res) => {

      const {
        lat,
        lng,
        page = 1,
        limit = 20,
        radius = 5000,
      } = req.query;


      /* ===================================================
         VALIDATE LOCATION
      =================================================== */

      const latitude =
        Number(lat);

      const longitude =
        Number(lng);

      if (
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude)
      ) {

        return res.status(400).json({

          success: false,

          message:
            "Valid latitude and longitude are required",

        });

      }


      /* ===================================================
         PAGINATION
      =================================================== */

      const currentPage =
        Math.max(
          Number(page) || 1,
          1
        );

      const perPage =
        Math.min(
          Math.max(
            Number(limit) || 20,
            1
          ),
          50
        );

      const skip =
        (currentPage - 1) *
        perPage;


      /* ===================================================
         SAFE RADIUS
      =================================================== */

      const maxDistance =
        Math.min(
          Math.max(
            Number(radius) || 5000,
            100
          ),
          25000
        );


      /* ===================================================
         GEO QUERY
      =================================================== */

      const nearbyBusinesses =
        await Business.aggregate([

          {
            $geoNear: {

              near: {

                type:
                  "Point",

                coordinates: [
                  longitude,
                  latitude,
                ],

              },

              distanceField:
                "distanceMeters",

              spherical:
                true,

              maxDistance,

              key:
                "location",

              query: {

                status:
                  "approved",

                isDeleted:
                  false,

              },

            },

          },


          /* ===============================================
             CITY
          =============================================== */

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


          /* ===============================================
             CATEGORY
          =============================================== */

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


          /* ===============================================
             SORT BY DISTANCE
          =============================================== */

          {
            $sort: {

              distanceMeters:
                1,

            },

          },


          /* ===============================================
             PAGINATION
          =============================================== */

          {

            $facet: {

              metadata: [

                {
                  $count:
                    "total",
                },

              ],

              data: [

                {
                  $skip:
                    skip,
                },

                {
                  $limit:
                    perPage,
                },

              ],

            },

          },

        ]);


      /* ===================================================
         RESPONSE DATA
      =================================================== */

      const result =
        nearbyBusinesses[0] || {};

      const total =
        result.metadata?.[0]?.total || 0;

      const totalPages =
        Math.ceil(
          total /
          perPage
        );


      const businesses =
        (result.data || []).map(
          (business) => ({

            ...business,

            distance:
              Number(
                (
                  business.distanceMeters /
                  1000
                ).toFixed(1)
              ),

          })
        );


      /* ===================================================
         RESPONSE
      =================================================== */

      return res.json({

        success:
          true,

        data:
          businesses,

        meta: {

          total,

          page:
            currentPage,

          limit:
            perPage,

          totalPages,

          radius:
            maxDistance,

          hasNextPage:
            currentPage <
            totalPages,

          hasPrevPage:
            currentPage >
            1,

          location: {

            lat:
              latitude,

            lng:
              longitude,

          },

        },

      });

    }
  );

  /* =========================================================
   🔥 GET POPULAR SEARCHES
========================================================= */

export const getPopularSearches =
  asyncHandler(
    async (req, res) => {

      const {
        city,
        limit = 6,
      } = req.query;


      /* ===================================================
         CITY RESOLUTION
      =================================================== */

      let cityDoc = null;
      let cityFilter = {};


      if (city) {

        cityDoc =
          await City.findOne({

            slug:
              String(city)
                .trim()
                .toLowerCase(),

            status:
              "active",

          })
          .select("_id name slug")
          .lean();


        if (
          !cityDoc &&
          city !== "india"
        ) {

          return res.status(404).json({

            success: false,

            message:
              "City not found",

          });

        }


        if (cityDoc) {

          cityFilter.cityId =
            cityDoc._id;

        }

      }


      /* ===================================================
         FIND ACTIVE CATEGORIES HAVING BUSINESSES
      =================================================== */

      const businesses =
        await Business.find({

          status:
            "approved",

          isDeleted:
            false,

          ...cityFilter,

        })
        .select(
          "categoryId categorySlug"
        )
        .populate(
          "categoryId",
          "name slug parentCategory status"
        )
        .lean();


      /* ===================================================
         UNIQUE CATEGORIES
      =================================================== */

      const categoryMap =
        new Map();


      for (const business of businesses) {

        const category =
          business.categoryId;


        if (!category) {
          continue;
        }


        if (
          category.status &&
          category.status !== "active"
        ) {
          continue;
        }


        const slug =
          category.slug ||
          business.categorySlug;


        if (!slug) {
          continue;
        }


        if (
          !categoryMap.has(slug)
        ) {

          categoryMap.set(
            slug,
            {
              name:
                category.name,

              slug:
                slug,

              count:
                1,
            }
          );

        } else {

          categoryMap.get(slug).count += 1;

        }

      }


      /* ===================================================
         SORT BY BUSINESS COUNT
      =================================================== */

      const popularCategories =
        Array.from(
          categoryMap.values()
        )
        .sort(
          (a, b) =>
            b.count - a.count
        )
        .slice(
          0,
          Math.min(
            Number(limit) || 6,
            20
          )
        );


      /* ===================================================
         FORMAT SEARCH ITEMS
      =================================================== */

      const cityName =
        cityDoc?.name ||
        "India";


      const searches =
        popularCategories.map(
          (category) => ({

            title:
              `${category.name} in ${cityName}`,

            categoryName:
              category.name,

            categorySlug:
              category.slug,

            cityName:
              cityDoc?.name || null,

            citySlug:
              cityDoc?.slug || "india",

            businessCount:
              category.count,

            url:
              cityDoc
                ? `/${cityDoc.slug}/${category.slug}`
                : `/${category.slug}`,

          })
        );


      /* ===================================================
         RESPONSE
      =================================================== */

      return res.json({

        success:
          true,

        data:
          searches,

        meta: {

          city:
            cityDoc
              ? {
                  name:
                    cityDoc.name,

                  slug:
                    cityDoc.slug,
                }
              : null,

          total:
            searches.length,

        },

      });

    }
  );