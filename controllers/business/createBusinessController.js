// backend/controllers/business/createBusinessController.js

import asyncHandler from "express-async-handler";
import mongoose from "mongoose";

import Business from "../../models/Business.js";
import City from "../../models/City.js";
import Category from "../../models/Category.js";

import { normalizeBusinessHours } from "../../utils/normalizeBusinessHours.js";
import { pingGoogleSitemap } from "../../utils/pingSitemap.js";
import { geocodeAddress } from "../../services/geocodeService.js";
import generateMeta from "../../utils/seoMeta.js";

import { generateBusinessSlug } from "../../services/business/businessSlugService.js";


/* =========================================================
   CORE VALIDATION
========================================================= */

const isValidObjectId = (id) =>
  mongoose.Types.ObjectId.isValid(id);


const requireField = (field, name) => {

  if (
    !field ||
    (
      typeof field === "string" &&
      !field.trim()
    )
  ) {

    throw new Error(
      `${name} is required`
    );

  }

};


/* =========================================================
   CREATE BUSINESS
========================================================= */

export const createBusiness = asyncHandler(
  async (req, res) => {

    const {
      name,
      categoryId,
      cityId,
      pincode,
      address,
      phone,
      whatsapp,
      landline,
      alternatePhone,
      phoneCode,
      website,
      description,
      location,
      logo,
      images,
      businessHours,
      district,
      state,
      services,
      serviceTypes,
      serviceCoverage,
      foodType,
      pricing,
      catalog,
      menu,
      faq,
      offers,
      tags,
      restaurantBooking,
      partyBooking,
      boost,
      isFeatured,
      isVerified,
      country,
      countryCode,
    } = req.body;


    /* =====================================================
       VALIDATION
    ===================================================== */

    try {

      requireField(
        name,
        "Business name"
      );

      requireField(
        categoryId,
        "Category"
      );

      requireField(
        cityId,
        "City"
      );

      requireField(
        pincode,
        "Pincode"
      );

      requireField(
        phone,
        "Phone"
      );

    } catch (err) {

      return res.status(400).json({

        success: false,

        message:
          err.message,

      });

    }


    if (
      !isValidObjectId(
        categoryId
      )
    ) {

      return res.status(400).json({

        success: false,

        message:
          "Invalid categoryId",

      });

    }


    if (
      !isValidObjectId(
        cityId
      )
    ) {

      return res.status(400).json({

        success: false,

        message:
          "Invalid cityId",

      });

    }


    /* =====================================================
       PINCODE
    ===================================================== */

    const cleanPincode =
      String(
        pincode
      ).replace(
        /\D/g,
        ""
      );


    if (
      cleanPincode.length !== 6
    ) {

      return res.status(400).json({

        success: false,

        message:
          "Pincode must be 6 digits",

      });

    }


    /* =====================================================
       COUNTRY PHONE CODE
    ===================================================== */

    const cleanPhoneCode =
      String(
        phoneCode ||
        "+91"
      )
        .replace(
          /[^\d+]/g,
          ""
        )
        .trim();


    const normalizedPhoneCode =
      cleanPhoneCode.startsWith("+")
        ? cleanPhoneCode
        : `+${cleanPhoneCode}`;


    /* =====================================================
       MAIN MOBILE
    ===================================================== */

    const cleanPhone =
      String(
        phone || ""
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
          "Main mobile number must be 10 digits",

      });

    }


    const fullPhone =
      `${normalizedPhoneCode}${cleanPhone}`;


    /* =====================================================
       WHATSAPP
    ===================================================== */

    const cleanWhatsapp =
      whatsapp
        ? String(
            whatsapp
          )
            .replace(
              /\D/g,
              ""
            )
            .slice(-10)
        : cleanPhone;


    if (
      cleanWhatsapp.length !== 10
    ) {

      return res.status(400).json({

        success: false,

        message:
          "WhatsApp number must be 10 digits",

      });

    }


    const fullWhatsapp =
      `${normalizedPhoneCode}${cleanWhatsapp}`;


    /* =====================================================
       LANDLINE
    ===================================================== */

    const cleanLandline =
      landline
        ? String(
            landline
          ).replace(
            /\D/g,
            ""
          )
        : "";


    if (
      cleanLandline &&
      (
        cleanLandline.length < 6 ||
        cleanLandline.length > 12
      )
    ) {

      return res.status(400).json({

        success: false,

        message:
          "Landline number must be between 6 and 12 digits",

      });

    }


    const fullLandline =
      cleanLandline
        ? `${normalizedPhoneCode}${cleanLandline}`
        : "";


    /* =====================================================
       ALTERNATE MOBILE
    ===================================================== */

    const cleanAlternatePhone =
      alternatePhone
        ? String(
            alternatePhone
          )
            .replace(
              /\D/g,
              ""
            )
            .slice(-10)
        : "";


    if (
      cleanAlternatePhone &&
      cleanAlternatePhone.length !== 10
    ) {

      return res.status(400).json({

        success: false,

        message:
          "Alternate mobile number must be 10 digits",

      });

    }


    const fullAlternatePhone =
      cleanAlternatePhone
        ? `${normalizedPhoneCode}${cleanAlternatePhone}`
        : "";


    /* =====================================================
       RESOLVE CITY
    ===================================================== */

    const city =
      await City.findById(
        cityId
      );


    if (!city) {

      return res.status(404).json({

        success: false,

        message:
          "City not found",

      });

    }


    /* =====================================================
       RESOLVE CATEGORY
    ===================================================== */

    const category =
      await Category.findById(
        categoryId
      );


    if (!category) {

      return res.status(404).json({

        success: false,

        message:
          "Category not found",

      });

    }


    /* =====================================================
       ADDRESS
    ===================================================== */

    const safeAddress = {

      street:
        address?.street?.trim() ||
        "",

      area:
        address?.area?.trim() ||
        "",

      landmark:
        address?.landmark?.trim() ||
        "",

    };


    /* =====================================================
       FULL ADDRESS
    ===================================================== */

    const fullAddress = [

      safeAddress.street,

      safeAddress.landmark,

      safeAddress.area,

      city.name,

      district,

      state,

      cleanPincode,

    ]
      .filter(Boolean)
      .join(", ");


    /* =====================================================
       LOCATION
    ===================================================== */

    let safeLocation = null;


    if (
      location &&
      location.type === "Point" &&
      Array.isArray(
        location.coordinates
      ) &&
      location.coordinates.length === 2
    ) {

      const lng =
        Number(
          location.coordinates[0]
        );


      const lat =
        Number(
          location.coordinates[1]
        );


      if (
        !isNaN(lat) &&
        !isNaN(lng) &&
        lat >= -90 &&
        lat <= 90 &&
        lng >= -180 &&
        lng <= 180
      ) {

        safeLocation = {

          type: "Point",

          coordinates: [
            lng,
            lat,
          ],

        };

      }

    }


    /* =====================================================
       GEOCODING FALLBACK
    ===================================================== */

    let finalLocation =
      safeLocation;


    if (
      !finalLocation
    ) {

      const addressLocation =
        await geocodeAddress({

          address:
            fullAddress,

          city:
            city.name,

          district,

          state,

          pincode:
            cleanPincode,

          country:
            country ||
            "India",

        });


      if (
        addressLocation?.location
      ) {

        finalLocation =
          addressLocation.location;

      }

    }


    /* =====================================================
       CITY CENTER FALLBACK
    ===================================================== */

    if (
      !finalLocation
    ) {

      const cityLat =
        Number(
          city.latitude
        );


      const cityLng =
        Number(
          city.longitude
        );


      if (
        !isNaN(cityLat) &&
        !isNaN(cityLng)
      ) {

        finalLocation = {

          type: "Point",

          coordinates: [
            cityLng,
            cityLat,
          ],

        };

      }

    }


    if (
      !finalLocation
    ) {

      return res.status(400).json({

        success: false,

        message:
          "Valid location required",

      });

    }


    /* =====================================================
       BUSINESS SLUG
    ===================================================== */

    const slug =
      await generateBusinessSlug(

        name,

        cityId,

        safeAddress.area

      );


    /* =====================================================
       STATUS
    ===================================================== */

    const status =
      req.user?.role === "admin" ||
      req.user?.role === "superadmin"
        ? "approved"
        : "pending";


    /* =====================================================
       SEO
    ===================================================== */

    const seoMeta =
      generateMeta({

        city:
          city.name,

        category:
          category.name,

        businessName:
          name,

        area:
          safeAddress.area,

        description:
          description ||
          "",

        isVerified:
          false,

        citySlug:
          city.slug,

        categorySlug:
          category.slug,

        businessSlug:
          slug,

      });


    /* =====================================================
       CREATE
    ===================================================== */

    const business =
      await Business.create({

        name:
          name.trim(),

        categoryId,

        cityId,

        cityName:
          city.name.toLowerCase(),

        citySlug:
          city.slug,

        categorySlug:
          category.slug,

        slug,


        address:
          safeAddress,


        district:
          district ||
          city.district ||
          "",

        state:
          state ||
          city.state ||
          "",


        country:
          country ||
          "India",

        countryCode:
          countryCode ||
          "IN",


        pincode:
          cleanPincode,


        phoneCountryCode:
          normalizedPhoneCode,

        phone:
          fullPhone,

        whatsapp:
          fullWhatsapp,

        landline:
          fullLandline,

        alternatePhone:
          fullAlternatePhone,


        website:
          website ||
          "",


        description:
          description ||
          "",


        foodType:
          foodType ||
          "",

        pricing:
          Array.isArray(pricing)
            ? pricing
            : [],

        catalog:
          Array.isArray(catalog)
            ? catalog
            : [],

        menu:
          Array.isArray(menu)
            ? menu
            : [],

        faq:
          Array.isArray(faq)
            ? faq
            : [],

        offers:
          Array.isArray(offers)
            ? offers
            : [],

        tags:
          Array.isArray(tags)
            ? tags
            : [],


        seo: {

          title:
            seoMeta.title,

          description:
            seoMeta.description,

          keywords:
            seoMeta.keywords,

          h1:
            seoMeta.h1,

        },


        location:
          finalLocation,


        logo:
          logo ||
          "",


        images:
          Array.isArray(images)
            ? images
            : [],


        services:
          Array.isArray(services)
            ? services
                .filter(
                  (service) =>
                    service &&
                    typeof service.name ===
                      "string" &&
                    service.name.trim()
                )
                .map(
                  (service) => ({

                    name:
                      service.name.trim(),

                    description:
                      typeof service.description ===
                        "string"
                        ? service.description.trim()
                        : "",

                  })
                )
            : [],


        serviceTypes:
          Array.isArray(serviceTypes)
            ? serviceTypes
            : [],


        serviceCoverage:
          serviceCoverage ||
          {

            type:
              "city",

            mode:
              "selected",

            cities:
              [],

            states:
              [],

            countries:
              [],

          },


        restaurantBooking:
          restaurantBooking ||
          {

            enabled:
              false,

            totalTables:
              "",

            seatingCapacity:
              "",

            advanceBookingDays:
              "",

          },


        partyBooking:
          partyBooking ||
          {

            enabled:
              false,

            bookingTypes:
              [],

            minGuests:
              "",

            maxGuests:
              "",

            advanceAmount:
              "",

            bookingNotice:
              "24h",

            timeSlots:
              [],

            contactNumber:
              "",

            whatsappBooking:
              false,

            notes:
              "",

          },


        businessHours:
          normalizeBusinessHours(
            businessHours ||
            {}
          ),


        boost:
          Boolean(
            boost
          ),


        isFeatured:
          Boolean(
            isFeatured
          ),


        isVerified:
          req.user?.role ===
            "admin" ||
          req.user?.role ===
            "superadmin"
            ? true
            : Boolean(
                isVerified
              ),


        status,

      });


    /* =====================================================
       POPULATE
    ===================================================== */

    const populatedBusiness =
      await Business.findById(
        business._id
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

    return res.status(201).json({

      success:
        true,

      data:
        populatedBusiness,

    });

  }
);