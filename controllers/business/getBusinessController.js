// backend/controllers/business/getBusinessController.js

import asyncHandler from "express-async-handler";

import Business from "../../models/Business.js";
import City from "../../models/City.js";
import Review from "../../models/Review.js";

import {
  resolveCategoryBySlug,
} from "../../services/resolver/categoryResolver.js";

import generateBusinessFAQ from "../../utils/generateBusinessFAQ.js";


/* =========================================================
   GET BUSINESS BY SLUG
========================================================= */

export const getBusinessBySlug = asyncHandler(
  async (req, res) => {

    /* =====================================================
       REQUEST PARAMS
    ===================================================== */

    const value =
      req.params.slug
        ?.toLowerCase()
        .trim();


    const requestedCitySlug =
      req.params.citySlug
        ?.toLowerCase()
        .trim();


    const requestedCategorySlug =
      req.params.categorySlug
        ?.toLowerCase()
        .trim();


    if (!value) {

      return res.status(400).json({

        success: false,

        message:
          "Slug is required",

      });

    }


    /* =====================================================
       STATE
    ===================================================== */

    let business = null;

    let isOldSlug = false;

    let isOldUrl = false;

    let isOldCategorySlug = false;

    let requestedCity = null;

    let requestedCategory = null;


    /* =====================================================
   1. RESOLVE CITY
===================================================== */

let canonicalRequestedCity = null;

if (requestedCitySlug) {

  // ===================================================
  // FIND CURRENT OR LEGACY CITY
  //
  // IMPORTANT:
  // Inactive city bhi find karna hai because
  // inactive city may redirect to another city.
  // ===================================================

  requestedCity =
    await City.findOne({

      slug:
        requestedCitySlug,

    })
    .select(
      "_id name slug state district status redirectToCity"
    )
    .lean();


  // ===================================================
  // CITY NOT FOUND
  // ===================================================

  if (!requestedCity) {

    return res.status(404).json({

      success: false,

      message:
        "City not found",

    });

  }


  // ===================================================
  // LEGACY / INACTIVE CITY
  // ===================================================

  if (
    requestedCity.status === "inactive" &&
    requestedCity.redirectToCity
  ) {

    canonicalRequestedCity =
      await City.findById(
        requestedCity.redirectToCity
      )
      .select(
        "_id name slug state district status"
      )
      .lean();


    // =================================================
    // VALID REDIRECT TARGET
    // =================================================

    if (
      !canonicalRequestedCity ||
      canonicalRequestedCity.status !== "active"
    ) {

      return res.status(404).json({

        success: false,

        message:
          "City redirect target not found",

      });

    }

  }
  else if (
    requestedCity.status === "active"
  ) {

    // =================================================
    // CURRENT ACTIVE CITY
    // =================================================

    canonicalRequestedCity =
      requestedCity;

  }
  else {

    // =================================================
    // INACTIVE WITHOUT REDIRECT
    // =================================================

    return res.status(404).json({

      success: false,

      message:
        "City not found",

    });

  }

}


    /* =====================================================
       2. RESOLVE CATEGORY
       
       Category Resolver supports:
       - current category slug
       - old category slugHistory
    ===================================================== */

    if (
      requestedCategorySlug
    ) {

      requestedCategory =
        await resolveCategoryBySlug(
          requestedCategorySlug
        );


      if (
        !requestedCategory
      ) {

        return res.status(404).json({

          success: false,

          message:
            "Category not found",

        });

      }

    }


    /* =====================================================
       DETECT OLD CATEGORY SLUG
    ===================================================== */

    const resolvedCategorySlug =
      requestedCategory?.slug
        ?.toLowerCase()
        .trim() || "";


    isOldCategorySlug =
      Boolean(

        requestedCategorySlug &&

        resolvedCategorySlug &&

        requestedCategorySlug !==
          resolvedCategorySlug

      );


    /* =====================================================
       3. CURRENT SLUG — CITY AWARE
    ===================================================== */

    if (
  requestedCity
) {

  const query = {

    cityId:
      canonicalRequestedCity._id,

    slug:
      value,

    status:
      "approved",

    isDeleted:
      false,

  };

      /* -----------------------------------------------
         CATEGORY MATCH
      ----------------------------------------------- */

      if (
        requestedCategory
      ) {

        query.categoryId =
          requestedCategory._id;

      }


      business =
        await Business.findOne(
          query
        );

    }


    /* =====================================================
       OLD COMPLETE URL — URL HISTORY
       
       EXACT MATCH:
       citySlug + categorySlug + business slug
    ===================================================== */

    if (
      !business &&
      requestedCitySlug &&
      requestedCategorySlug
    ) {

      business =
        await Business.findOne({

          urlHistory: {

            $elemMatch: {

              citySlug:
                requestedCitySlug,

              categorySlug:
                requestedCategorySlug,

              slug:
                value,

            },

          },

          status:
            "approved",

          isDeleted:
            false,

        });


      if (
        business
      ) {

        isOldUrl = true;

      }

    }


    /* =====================================================
       4. OLD SLUG — LEGACY HISTORY LOOKUP
       
       ONLY when citySlug is NOT present.

       Structured URLs use exact urlHistory above.
    ===================================================== */

    if (
      !business &&
      !requestedCitySlug
    ) {

      business =
        await Business.findOne({

          slugHistory:
            value,

          status:
            "approved",

          isDeleted:
            false,

        });


      if (
        business
      ) {

        isOldSlug = true;

      }

    }


    /* =====================================================
       5. LEGACY FALLBACK
       
       Used only for legacy slug-only requests.
    ===================================================== */

    if (
      !business &&
      !requestedCitySlug
    ) {

      /* -----------------------------------------------
         CURRENT SLUG
      ----------------------------------------------- */

      business =
        await Business.findOne({

          slug:
            value,

          status:
            "approved",

          isDeleted:
            false,

        });


      /* -----------------------------------------------
         OLD SLUG
      ----------------------------------------------- */

      if (
        !business
      ) {

        business =
          await Business.findOne({

            slugHistory:
              value,

            status:
              "approved",

            isDeleted:
              false,

          });


        if (
          business
        ) {

          isOldSlug = true;

        }

      }

    }


    /* =====================================================
       6. NOT FOUND
    ===================================================== */

    if (
      !business
    ) {

      return res.status(404).json({

        success: false,

        message:
          "Business not found",

      });

    }


    /* =====================================================
       7. POPULATE CANONICAL BUSINESS
    ===================================================== */

    const populatedBusiness =
      await Business.findById(
        business._id
      )

        .populate(
          "cityId",
          "name slug state district"
        )

        .populate(
          "categoryId",
          "name slug uiType features"
        )

        .lean();


    if (
      !populatedBusiness
    ) {

      return res.status(404).json({

        success: false,

        message:
          "Business not found",

      });

    }


    /* =====================================================
       8. CANONICAL CITY
    ===================================================== */

    const canonicalCitySlug =
      populatedBusiness.citySlug ||
      populatedBusiness.cityId?.slug ||
      "";


    /* =====================================================
       9. CANONICAL CATEGORY
    ===================================================== */

    const canonicalCategorySlug =
      populatedBusiness.categorySlug ||
      populatedBusiness.categoryId?.slug ||
      "";


    /* =====================================================
       10. CANONICAL BUSINESS SLUG
    ===================================================== */

    const canonicalBusinessSlug =
      populatedBusiness.slug ||
      "";


    /* =====================================================
       11. CANONICAL URL
    ===================================================== */

    const canonicalUrl =
      `https://servdial.com/` +
      `${canonicalCitySlug}/` +
      `${canonicalCategorySlug}/` +
      `${canonicalBusinessSlug}`;


    /* =====================================================
       12. OLD URL → REDIRECT SIGNAL
       
       IMPORTANT:
       Frontend receives redirect:true and navigates
       to canonical URL.
    ===================================================== */

    if (
      isOldSlug ||
      isOldUrl ||
      isOldCategorySlug
    ) {

      return res.json({

        success:
          true,

        redirect:
          true,


        oldSlug:
          isOldSlug
            ? value
            : null,


        oldCategorySlug:
          isOldCategorySlug
            ? requestedCategorySlug
            : null,


        oldUrl:
          isOldUrl
            ? {

                citySlug:
                  requestedCitySlug,

                categorySlug:
                  requestedCategorySlug,

                slug:
                  value,

              }
            : null,


        canonicalSlug:
          canonicalBusinessSlug,


        canonicalCitySlug:
          canonicalCitySlug,


        canonicalCategorySlug:
          canonicalCategorySlug,


        canonicalUrl:
          canonicalUrl,


        data: {

          business:
            populatedBusiness,

          reviews:
            [],

        },


        message:
          "Business URL has moved",

      });

    }


    /* =====================================================
       13. LANGUAGE
    ===================================================== */

    const language =
      (
        req.query.lang ||

        req.headers[
          "accept-language"
        ]
          ?.split(",")[0]
          ?.split("-")[0] ||

        "en"

      ).toLowerCase();


    const supportedLanguages = [

      "en",
      "hi",
      "bn",
      "mr",
      "ta",
      "te",
      "gu",

    ];


    const finalLanguage =
      supportedLanguages.includes(
        language
      )
        ? language
        : "en";


    /* =====================================================
       14. FAQ
    ===================================================== */

    populatedBusiness.faq =
      generateBusinessFAQ({

        business:
          populatedBusiness,

        language:
          finalLanguage,

      });


    /* =====================================================
       15. REVIEWS
    ===================================================== */

    const reviews =
      await Review.find({

        businessId:
          populatedBusiness._id,

        status:
          "approved",

      })

        .sort({

          createdAt:
            -1,

        })

        .limit(20)

        .lean();


    /* =====================================================
       16. CACHE
    ===================================================== */

    res.setHeader(

      "Cache-Control",

      "public, max-age=300, stale-while-revalidate=600"

    );


    /* =====================================================
       17. RESPONSE
    ===================================================== */

    return res.json({

      success:
        true,

      redirect:
        false,


      canonicalSlug:
        canonicalBusinessSlug,


      canonicalCitySlug:
        canonicalCitySlug,


      canonicalCategorySlug:
        canonicalCategorySlug,


      canonicalUrl:
        canonicalUrl,


      data: {

        business:
          populatedBusiness,

        reviews,

      },

    });

  }
);