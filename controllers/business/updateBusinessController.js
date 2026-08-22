// backend/controllers/business/updateBusinessController.js

import asyncHandler from "express-async-handler";
import mongoose from "mongoose";

import Business from "../../models/Business.js";
import City from "../../models/City.js";
import Category from "../../models/Category.js";

import { normalizeBusinessHours } from "../../utils/normalizeBusinessHours.js";
import { pingGoogleSitemap } from "../../utils/pingSitemap.js";
import { geocodeAddress } from "../../services/geocodeService.js";
import generateMeta from "../../utils/seoMeta.js";

import {
  generateBusinessSlug,
  getBusinessUrlChangeState,
  buildBusinessUrlHistoryEntry,
} from "../../services/business/businessSlugService.js";


/* =========================================================
   CORE VALIDATION
========================================================= */

const isValidObjectId = (id) =>
  mongoose.Types.ObjectId.isValid(id);


/* =========================================================
   UPDATE BUSINESS
========================================================= */

export const updateBusiness = asyncHandler(
  async (req, res) => {

    const { id } = req.params;


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
       LOAD BUSINESS
    ===================================================== */

    const business =
      await Business.findById(id);


    if (!business) {

      return res.status(404).json({

        success: false,

        message:
          "Business not found",

      });

    }


    /* =====================================================
       UPDATE PAYLOAD
    ===================================================== */

    const updates = {
      ...req.body,
    };


    console.log(
      "🔥 UPDATE BODY:",
      req.body
    );


    /* =====================================================
       HARD PROTECTION
    ===================================================== */

    delete updates.slug;
    delete updates.slugHistory;
    delete updates.urlHistory;

    delete updates.citySlug;
    delete updates.categorySlug;

    delete updates.status;


    /* =====================================================
       ADDRESS NORMALIZE
    ===================================================== */

    if (
      updates.address
    ) {

      if (
        typeof updates.address ===
          "object"
      ) {

        updates.address = {

          street:
            updates.address.street?.trim() ||
            "",

          area:
            updates.address.area?.trim() ||
            "",

          landmark:
            updates.address.landmark?.trim() ||
            "",

        };

      }

      else if (
        typeof updates.address ===
          "string"
      ) {

        updates.address = {

          street:
            updates.address.trim(),

          area:
            "",

          landmark:
            "",

        };

      }

    }


    /* =====================================================
       PINCODE
    ===================================================== */

    if (
      updates.pincode
    ) {

      updates.pincode =
        String(
          updates.pincode
        )
          .replace(
            /\D/g,
            ""
          );


      if (
        updates.pincode.length !== 6
      ) {

        return res.status(400).json({

          success: false,

          message:
            "Invalid pincode",

        });

      }

    }


    /* =====================================================
       PHONE
    ===================================================== */

    if (
      updates.phone
    ) {

      const cleanPhone =
        String(
          updates.phone
        )
          .replace(
            /\D/g,
            ""
          )
          .slice(-10);


      if (
        cleanPhone.length !== 10
      ) {

        return res.status(400).json({

          success: false,

          message:
            "Invalid phone number",

        });

      }


      const phoneCode =
        String(
          updates.phoneCode ||
          business.phoneCode ||
          "+91"
        )
          .replace(
            /[^\d+]/g,
            ""
          );


      const normalizedCode =
        phoneCode.startsWith("+")
          ? phoneCode
          : `+${phoneCode}`;


      updates.phone =
        `${normalizedCode}${cleanPhone}`;

    }


    /* =====================================================
       WHATSAPP
    ===================================================== */

    if (
      updates.whatsapp
    ) {

      const clean =
        String(
          updates.whatsapp
        )
          .replace(
            /\D/g,
            ""
          )
          .slice(-10);


      if (
        clean.length !== 10
      ) {

        return res.status(400).json({

          success: false,

          message:
            "Invalid WhatsApp number",

        });

      }


      const code =
        updates.phoneCode ||
        business.phoneCode ||
        "+91";


      updates.whatsapp =
        `${code}${clean}`;

    }


    /* =====================================================
       ALTERNATE MOBILE
    ===================================================== */

    if (
      updates.alternatePhone
    ) {

      const clean =
        String(
          updates.alternatePhone
        )
          .replace(
            /\D/g,
            ""
          )
          .slice(-10);


      if (
        clean.length !== 10
      ) {

        return res.status(400).json({

          success: false,

          message:
            "Invalid alternate mobile number",

        });

      }


      const code =
        updates.phoneCode ||
        business.phoneCode ||
        "+91";


      updates.alternatePhone =
        `${code}${clean}`;

    }


    /* =====================================================
       CITY + CATEGORY
    ===================================================== */

    let city = null;
    let category = null;


    /* =====================================================
       CITY RESOLVE
    ===================================================== */

    if (
      updates.cityId
    ) {

      if (
        !isValidObjectId(
          updates.cityId
        )
      ) {

        return res.status(400).json({

          success: false,

          message:
            "Invalid cityId",

        });

      }


      city =
        await City.findById(
          updates.cityId
        );


      if (!city) {

        return res.status(404).json({

          success: false,

          message:
            "City not found",

        });

      }


      updates.citySlug =
        city.slug;


      updates.cityName =
        city.name.toLowerCase();

    }

    else {

      city =
        await City.findById(
          business.cityId
        );

    }


    /* =====================================================
       CATEGORY RESOLVE
    ===================================================== */

    if (
      updates.categoryId
    ) {

      if (
        !isValidObjectId(
          updates.categoryId
        )
      ) {

        return res.status(400).json({

          success: false,

          message:
            "Invalid categoryId",

        });

      }


      category =
        await Category.findById(
          updates.categoryId
        );


      if (!category) {

        return res.status(404).json({

          success: false,

          message:
            "Category not found",

        });

      }


      updates.categorySlug =
        category.slug;

    }

    else {

      category =
        await Category.findById(
          business.categoryId
        );

    }


    /* =====================================================
       URL CHANGE DETECTION
    ===================================================== */

    const {
      urlChanged,
      slugNeedsRegeneration,
    } =
      getBusinessUrlChangeState(
        business,
        updates
      );


    /* =====================================================
       SAVE OLD COMPLETE URL
    ===================================================== */

    if (
      urlChanged
    ) {

      updates.$push = {

        ...(updates.$push || {}),

        urlHistory:
          buildBusinessUrlHistoryEntry(
            business
          ),

      };

    }


    /* =====================================================
       SLUG REGENERATION
    ===================================================== */

    if (
      slugNeedsRegeneration
    ) {

      /* ===================================================
         CLEAN NAME
      =================================================== */

      const finalName =
        updates.name !== undefined
          ? updates.name
              .trim()
              .replace(
                /\s+/g,
                " "
              )
          : business.name;


      /* ===================================================
         FINAL CITY
      =================================================== */

      const finalCityId =
        updates.cityId ||
        business.cityId;


      /* ===================================================
         FINAL AREA
      =================================================== */

      const finalArea =
        updates.address?.area !== undefined
          ? updates.address.area
          : business.address?.area ||
            "";


      /* ===================================================
         GENERATE NEW SLUG
      =================================================== */

      const newSlug =
        await generateBusinessSlug(

          finalName,

          finalCityId,

          finalArea

        );


      /* ===================================================
         SAVE CLEAN NAME
      =================================================== */

      updates.name =
        finalName;


      /* ===================================================
         SAVE OLD SLUG
      =================================================== */

      if (
        business.slug &&
        business.slug !==
          newSlug
      ) {

        updates.$addToSet = {

          ...(updates.$addToSet || {}),

          slugHistory:
            business.slug,

        };

      }


      /* ===================================================
         SAVE NEW SLUG
      =================================================== */

      updates.slug =
        newSlug;

    }


    /* =====================================================
       BUSINESS HOURS
    ===================================================== */

    if (
      updates.businessHours
    ) {

      updates.businessHours =
        normalizeBusinessHours(
          updates.businessHours
        );

    }


    /* =====================================================
       GEO UPDATE
    ===================================================== */

    const addressChanged =
      updates.address ||
      updates.cityId ||
      updates.district ||
      updates.state ||
      updates.pincode;


    /* =====================================================
       SEO
    ===================================================== */

    const finalCity =
      city?.name ||
      business.cityName ||
      "";


    const finalCategory =
      category?.name ||
      "";


    const finalAddress =
      updates.address ||
      business.address ||
      {};


    const seoMeta =
      generateMeta({

        city:
          finalCity,

        category:
          finalCategory,

        businessName:
          updates.name ||
          business.name,

        area:
          finalAddress?.area ||
          "",

        description:
          updates.description !==
          undefined

            ? updates.description

            : business.description ||
              "",

        isVerified:
          updates.isVerified !==
          undefined

            ? updates.isVerified

            : business.isVerified ||
              false,

        citySlug:
          city?.slug ||
          business.citySlug ||
          "",

        categorySlug:
          category?.slug ||
          business.categorySlug ||
          "",

        businessSlug:
          updates.slug ||
          business.slug ||
          "",

      });


    updates.seo = {

      title:
        seoMeta.title,

      description:
        seoMeta.description,

      keywords:
        seoMeta.keywords,

      h1:
        seoMeta.h1,

    };


    /* =====================================================
       ADDRESS → GEOLOCATION
    ===================================================== */

    if (
      addressChanged
    ) {

      const finalAddress =
        updates.address ||
        business.address;


      const fullAddress = [

        finalAddress?.street,

        finalAddress?.landmark,

        finalAddress?.area,

        city?.name ||
        business.cityName,

        updates.district ||
        business.district,

        updates.state ||
        business.state,

        updates.pincode ||
        business.pincode,

      ]
        .filter(Boolean)
        .join(", ");


      const addressLocation =
        await geocodeAddress({

          address:
            fullAddress,

          city:
            city?.name ||
            business.cityName,

          district:
            updates.district ||
            business.district,

          state:
            updates.state ||
            business.state,

          pincode:
            updates.pincode ||
            business.pincode,

        });


      if (
        !updates.location &&
        addressLocation?.location
      ) {

        updates.location =
          addressLocation.location;

      }

    }


    /* =====================================================
       ARRAY NORMALIZATION
    ===================================================== */

    if (
      updates.pricing &&
      !Array.isArray(
        updates.pricing
      )
    ) {

      updates.pricing = [];

    }


    if (
      updates.menu &&
      !Array.isArray(
        updates.menu
      )
    ) {

      updates.menu = [];

    }


    if (
      updates.catalog &&
      !Array.isArray(
        updates.catalog
      )
    ) {

      updates.catalog = [];

    }


    if (
      updates.faq &&
      !Array.isArray(
        updates.faq
      )
    ) {

      updates.faq = [];

    }


    if (
      updates.offers &&
      !Array.isArray(
        updates.offers
      )
    ) {

      updates.offers = [];

    }


    if (
      updates.tags &&
      !Array.isArray(
        updates.tags
      )
    ) {

      updates.tags = [];

    }


    /* =====================================================
       UPDATE DATABASE
    ===================================================== */

    const updated =
      await Business.findByIdAndUpdate(

        id,

        updates,

        {

          new:
            true,

          runValidators:
            true,

        }

      )

      .populate(
        "cityId",
        "name slug"
      )

      .populate(
        "categoryId",
        "name slug uiType features"
      );


    /* =====================================================
       SITEMAP
    ===================================================== */

    await pingGoogleSitemap();


    /* =====================================================
       RESPONSE
    ===================================================== */

    return res.json({

      success:
        true,

      data:
        updated,

    });

  }
);