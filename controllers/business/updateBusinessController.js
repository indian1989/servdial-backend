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
   HELPERS
========================================================= */

const isValidObjectId = (id) =>
  mongoose.Types.ObjectId.isValid(id);


const normalizeString = (value) => {

  if (
    value === undefined ||
    value === null
  ) {
    return value;
  }

  return String(value)
    .trim()
    .replace(/\s+/g, " ");

};


const normalizeCountryCode = (
  value,
  fallback = "+91"
) => {

  const code =
    String(
      value || fallback
    )
      .replace(/[^\d+]/g, "")
      .trim();

  if (!code) {
    return fallback;
  }

  return code.startsWith("+")
    ? code
    : `+${code}`;

};


const cleanMobileNumber = (
  value
) => {

  return String(
    value || ""
  )
    .replace(/\D/g, "")
    .slice(-10);

};


const cleanLandlineNumber = (
  value
) => {

  return String(
    value || ""
  )
    .replace(/\D/g, "");

};


const normalizeArray = (
  value
) => {

  return Array.isArray(value)
    ? value
    : [];

};


/* =========================================================
   UPDATE BUSINESS
========================================================= */

export const updateBusiness =
  asyncHandler(
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
         BUILD UPDATE PAYLOAD
      ===================================================== */

        const updates = {
        ...req.body,
        };

        const confirmDuplicateContact =
        Boolean(req.body.confirmDuplicateContact);

        delete updates.confirmDuplicateContact;

      /* =====================================================
         REMOVE MONGODB OPERATORS
         Prevent client-side operator injection
      ===================================================== */

      Object.keys(updates)
        .filter(
          (key) =>
            key.startsWith("$") ||
            key.includes(".")
        )
        .forEach(
          (key) => {
            delete updates[key];
          }
        );


      /* =====================================================
         HARD PROTECTION
      ===================================================== */

      delete updates._id;
      delete updates.id;

      delete updates.createdAt;
      delete updates.updatedAt;

      delete updates.slug;
      delete updates.slugHistory;
      delete updates.urlHistory;

      delete updates.cityName;
      delete updates.citySlug;

      delete updates.categorySlug;

      delete updates.parentCategoryId;

      delete updates.status;


      /* =====================================================
         BASIC STRING NORMALIZATION
      ===================================================== */

      if (
        updates.name !== undefined
      ) {

        updates.name =
          normalizeString(
            updates.name
          );

        if (!updates.name) {

          return res.status(400).json({

            success: false,

            message:
              "Business name is required",

          });

        }

      }


      if (
        updates.description !== undefined
      ) {

        updates.description =
          normalizeString(
            updates.description
          ) || "";

      }


      if (
        updates.website !== undefined
      ) {

        updates.website =
          String(
            updates.website || ""
          ).trim();

      }


      /* =====================================================
         ADDRESS NORMALIZATION
      ===================================================== */

      if (
        updates.address !== undefined
      ) {

        if (
          typeof updates.address ===
          "object" &&
          updates.address !== null
        ) {

          updates.address = {

            street:
              normalizeString(
                updates.address.street
              ) || "",

            area:
              normalizeString(
                updates.address.area
              ) || "",

            landmark:
              normalizeString(
                updates.address.landmark
              ) || "",

          };

        }

        else if (
          typeof updates.address ===
          "string"
        ) {

          updates.address = {

            street:
              normalizeString(
                updates.address
              ) || "",

            area:
              "",

            landmark:
              "",

          };

        }

        else {

          return res.status(400).json({

            success: false,

            message:
              "Invalid address",

          });

        }

      }


      /* =====================================================
         PINCODE
      ===================================================== */

      if (
        updates.pincode !== undefined
      ) {

        updates.pincode =
          String(
            updates.pincode || ""
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
         RESPONSE TIME
      ===================================================== */

      if (
        updates.responseTime !== undefined &&
        updates.responseTime !== null &&
        updates.responseTime !== ""
      ) {

        const parsedResponseTime =
          Number(
            updates.responseTime
          );


        if (
          !Number.isFinite(
            parsedResponseTime
          ) ||
          parsedResponseTime < 0
        ) {

          return res.status(400).json({

            success: false,

            message:
              "Response time must be a valid non-negative number",

          });

        }


        updates.responseTime =
          parsedResponseTime;

      }


      /* =====================================================
         COUNTRY
      ===================================================== */

      if (
        updates.country !== undefined
      ) {

        updates.country =
          normalizeString(
            updates.country
          ) || "India";

      }


      if (
        updates.countryCode !== undefined
      ) {

        updates.countryCode =
          String(
            updates.countryCode ||
            "IN"
          )
            .trim()
            .toUpperCase();

      }


      /* =====================================================
         PHONE / MOBILE
      ===================================================== */

      if (
        updates.phone !== undefined
      ) {

        if (
          updates.phone === "" ||
          updates.phone === null
        ) {

          updates.phone = "";

        }

        else {

          const cleanPhone =
            cleanMobileNumber(
              updates.phone
            );


          if (
            cleanPhone.length !== 10
          ) {

            return res.status(400).json({

              success: false,

              message:
                "Invalid phone number",

            });

          }


          updates.phone =
            cleanPhone;

        }

      }


      /* =====================================================
         PHONE COUNTRY CODE
      ===================================================== */

      if (
        updates.phoneCountryCode !== undefined
      ) {

        updates.phoneCountryCode =
          normalizeCountryCode(
            updates.phoneCountryCode,
            business.phoneCountryCode ||
            "+91"
          );

      }


      /* =====================================================
         WHATSAPP
      ===================================================== */

      if (
        updates.whatsapp !== undefined
      ) {

        if (
          updates.whatsapp === "" ||
          updates.whatsapp === null
        ) {

          updates.whatsapp = "";

        }

        else {

          const cleanWhatsapp =
            cleanMobileNumber(
              updates.whatsapp
            );


          if (
            cleanWhatsapp.length !== 10
          ) {

            return res.status(400).json({

              success: false,

              message:
                "Invalid WhatsApp number",

            });

          }


          updates.whatsapp =
            cleanWhatsapp;

        }

      }


      /* =====================================================
         WHATSAPP COUNTRY CODE
      ===================================================== */

      if (
        updates.whatsappCountryCode !== undefined
      ) {

        updates.whatsappCountryCode =
          normalizeCountryCode(
            updates.whatsappCountryCode,
            business.whatsappCountryCode ||
            business.phoneCountryCode ||
            "+91"
          );

      }


      /* =====================================================
         ALTERNATE PHONE
      ===================================================== */

      if (
        updates.alternatePhone !== undefined
      ) {

        if (
          updates.alternatePhone === "" ||
          updates.alternatePhone === null
        ) {

          updates.alternatePhone = "";

        }

        else {

          const cleanAlternate =
            cleanMobileNumber(
              updates.alternatePhone
            );


          if (
            cleanAlternate.length !== 10
          ) {

            return res.status(400).json({

              success: false,

              message:
                "Invalid alternate mobile number",

            });

          }


          updates.alternatePhone =
            cleanAlternate;

        }

      }


      /* =====================================================
         ALTERNATE PHONE COUNTRY CODE
      ===================================================== */

      if (
        updates.alternatePhoneCountryCode !== undefined
      ) {

        updates.alternatePhoneCountryCode =
          normalizeCountryCode(
            updates.alternatePhoneCountryCode,
            business.alternatePhoneCountryCode ||
            business.phoneCountryCode ||
            "+91"
          );

      }


      /* =====================================================
         LANDLINE
      ===================================================== */

      if (
        updates.landline !== undefined
      ) {

        if (
          updates.landline === "" ||
          updates.landline === null
        ) {

          updates.landline = "";

        }

        else {

          const cleanLandline =
            cleanLandlineNumber(
              updates.landline
            );


          if (
            cleanLandline.length < 6 ||
            cleanLandline.length > 12
          ) {

            return res.status(400).json({

              success: false,

              message:
                "Invalid landline number",

            });

          }


          updates.landline =
            cleanLandline;

        }

      }


      /* =====================================================
         LANDLINE COUNTRY CODE
      ===================================================== */

      if (
        updates.landlineCountryCode !== undefined
      ) {

        updates.landlineCountryCode =
          normalizeCountryCode(
            updates.landlineCountryCode,
            business.landlineCountryCode ||
            business.phoneCountryCode ||
            "+91"
          );

      }


      /* =====================================================
         FINAL CONTACT VALIDATION

         FINAL RULE:
         Mobile OR Landline minimum one required.
         Both are allowed.
         WhatsApp / alternate phone are optional.
      ===================================================== */

      const finalPhone =
        updates.phone !== undefined
          ? updates.phone
          : business.phone || "";


      const finalLandline =
        updates.landline !== undefined
          ? updates.landline
          : business.landline || "";


      if (
        !finalPhone &&
        !finalLandline
      ) {

        return res.status(400).json({

          success: false,

          message:
            "At least one contact number is required: Mobile or Landline",

        });

      }

            /* =====================================================
         DUPLICATE PHONE / LANDLINE VALIDATION
         
         FINAL RULE:

         PROVIDER:
         - Same provider → duplicate phone/landline allowed
         - Different provider → duplicate phone/landline blocked
         - Phone ↔ Landline cross-duplicate also blocked

         ADMIN / SUPERADMIN:
         - Duplicate is warning only
         - Reconfirmation required
         - Admin-created business may have owner = null
      ===================================================== */

      const finalContactNumbers = [
  finalPhone,
  finalLandline,
  updates.alternatePhone !== undefined
    ? updates.alternatePhone
    : business.alternatePhone || "",
].filter(Boolean);


if (finalContactNumbers.length > 0) {

  const duplicateConditions = [];


  /* -------------------------------------------------
     PHONE MATCHES PHONE / ALTERNATE PHONE / LANDLINE
  ------------------------------------------------- */

  if (finalPhone) {

    duplicateConditions.push(
      {
        phone: finalPhone,
      },
      {
        alternatePhone: finalPhone,
      },
      {
        landline: finalPhone,
      }
    );

  }


  /* -------------------------------------------------
     ALTERNATE PHONE MATCHES PHONE / ALTERNATE PHONE / LANDLINE
  ------------------------------------------------- */

  const finalAlternatePhone =
    updates.alternatePhone !== undefined
      ? updates.alternatePhone
      : business.alternatePhone || "";


  if (finalAlternatePhone) {

    duplicateConditions.push(
      {
        phone: finalAlternatePhone,
      },
      {
        alternatePhone: finalAlternatePhone,
      },
      {
        landline: finalAlternatePhone,
      }
    );

  }


  /* -------------------------------------------------
     LANDLINE MATCHES PHONE / ALTERNATE PHONE / LANDLINE
  ------------------------------------------------- */

  if (finalLandline) {

    duplicateConditions.push(
      {
        phone: finalLandline,
      },
      {
        alternatePhone: finalLandline,
      },
      {
        landline: finalLandline,
      }
    );

  }


  if (duplicateConditions.length > 0) {

    const isAdmin =
      ["admin", "superadmin"].includes(
        String(
          req.user?.role || ""
        ).toLowerCase()
      );


    /* ===============================================
       PROVIDER SIDE — STRICT

       Same provider:
       → same phone allowed
       → same alternatePhone allowed
       → same landline allowed

       Different provider:
       → phone duplicate blocked
       → alternatePhone duplicate blocked
       → landline duplicate blocked

       Cross-field duplicate also blocked:
       phone ↔ alternatePhone
       phone ↔ landline
       alternatePhone ↔ landline
    =============================================== */

    if (!isAdmin) {

      const duplicateBusiness =
        await Business.findOne({

          _id: {
            $ne: id,
          },

          owner: {
            $ne: req.user._id,
          },

          $or:
            duplicateConditions,

        })
          .select(
            "_id name phone alternatePhone landline owner cityName"
          )
          .lean();


      if (duplicateBusiness) {

        return res.status(409).json({

          success: false,

          code:
            "DUPLICATE_CONTACT_NUMBER",

          message:
            "This mobile, alternate mobile or landline number is already used by another provider.",

          duplicate: {

            businessId:
              duplicateBusiness._id,

            businessName:
              duplicateBusiness.name,

            phone:
              duplicateBusiness.phone ||
              "",

            alternatePhone:
              duplicateBusiness.alternatePhone ||
              "",

            landline:
              duplicateBusiness.landline ||
              "",

            cityName:
              duplicateBusiness.cityName ||
              "",

          },

        });

      }

    }


    /* ===============================================
       ADMIN / SUPERADMIN SIDE

       Duplicate = warning.
       Confirmation required.
    =============================================== */

    else {

      const duplicateBusiness =
        await Business.findOne({

          _id: {
            $ne: id,
          },

          $or:
            duplicateConditions,

        })
          .select(
            "_id name phone alternatePhone landline owner cityName"
          )
          .lean();


      if (
        duplicateBusiness &&
        !confirmDuplicateContact
      ) {

        return res.status(409).json({

          success: false,

          code:
            "DUPLICATE_CONTACT_WARNING",

          requiresConfirmation:
            true,

          message:
            "This mobile, alternate mobile or landline number is already used by another business. Please confirm to continue.",

          duplicate: {

            businessId:
              duplicateBusiness._id,

            businessName:
              duplicateBusiness.name,

            phone:
              duplicateBusiness.phone ||
              "",

            alternatePhone:
              duplicateBusiness.alternatePhone ||
              "",

            landline:
              duplicateBusiness.landline ||
              "",

            cityName:
              duplicateBusiness.cityName ||
              "",

          },

        });

      }

    }

  }

}


      /* =====================================================
         CITY
      ===================================================== */

      let city = null;


      if (
        updates.cityId !== undefined
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

      }

      else {

        city =
          await City.findById(
            business.cityId
          );

      }


      if (!city) {

        return res.status(404).json({

          success: false,

          message:
            "Business city not found",

        });

      }


      /* =====================================================
         CATEGORY
      ===================================================== */

      let category = null;


      if (
        updates.categoryId !== undefined
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

      }

      else {

        category =
          await Category.findById(
            business.categoryId
          );

      }


      if (!category) {

        return res.status(404).json({

          success: false,

          message:
            "Business category not found",

        });

      }


      /* =====================================================
         CITY CACHE
      ===================================================== */

      updates.cityName =
        String(
          city.name || ""
        )
          .trim()
          .toLowerCase();


      updates.citySlug =
        city.slug;


      /* =====================================================
         CATEGORY CACHE
      ===================================================== */

      updates.categorySlug =
        category.slug;


      updates.parentCategoryId =
        category.parentCategory ||
        null;


      /* =====================================================
         CITY DERIVED DATA
      ===================================================== */

      if (
        updates.cityId !== undefined
      ) {

        updates.district =
          normalizeString(
            city.district
          ) || "";

        updates.state =
          normalizeString(
            city.state
          ) || "";

      }


      /* =====================================================
         LOCATION VALIDATION
      ===================================================== */

      if (
        updates.location !== undefined
      ) {

        const location =
          updates.location;


        if (
          !location ||
          location.type !== "Point" ||
          !Array.isArray(
            location.coordinates
          ) ||
          location.coordinates.length !== 2
        ) {

          return res.status(400).json({

            success: false,

            message:
              "Location must be a valid GeoJSON Point with [lng, lat]",

          });

        }


        const lng =
          Number(
            location.coordinates[0]
          );


        const lat =
          Number(
            location.coordinates[1]
          );


        if (
          !Number.isFinite(lat) ||
          !Number.isFinite(lng) ||
          lat < -90 ||
          lat > 90 ||
          lng < -180 ||
          lng > 180
        ) {

          return res.status(400).json({

            success: false,

            message:
              "Invalid location coordinates",

          });

        }


        updates.location = {

          type:
            "Point",

          coordinates: [
            lng,
            lat,
          ],

        };

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
         URL HISTORY
      ===================================================== */

      const updateOperators = {};


      if (
        urlChanged
      ) {

        updateOperators.$push = {

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

        const finalName =
          updates.name !== undefined
            ? normalizeString(
                updates.name
              )
            : business.name;


        const finalCityId =
          updates.cityId ||
          business.cityId;


        const finalArea =
          updates.address?.area !==
          undefined

            ? normalizeString(
                updates.address.area
              )

            : normalizeString(
                business.address?.area
              ) || "";


        const newSlug =
          await generateBusinessSlug(

            finalName,

            finalCityId,

            finalArea

          );


        updates.name =
          finalName;


        updates.slug =
          newSlug;


        /* ===================================================
           PRESERVE OLD SLUG
        =================================================== */

        if (
          business.slug &&
          business.slug !== newSlug
        ) {

          updateOperators.$addToSet = {

            slugHistory:
              business.slug,

          };

        }

      }


      /* =====================================================
         BUSINESS HOURS
      ===================================================== */

      if (
        updates.businessHours !==
        undefined
      ) {

        updates.businessHours =
          normalizeBusinessHours(
            updates.businessHours ||
            {}
          );

      }


      /* =====================================================
         SERVICES
      ===================================================== */

      if (
        updates.services !==
        undefined
      ) {

        updates.services =
          Array.isArray(
            updates.services
          )

            ? updates.services
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
                      normalizeString(
                        service.name
                      ),

                    description:
                      typeof service.description ===
                      "string"

                        ? normalizeString(
                            service.description
                          )

                        : "",

                  })
                )

            : [];

      }


      /* =====================================================
         SERVICE TYPES
      ===================================================== */

      if (
        updates.serviceTypes !==
        undefined
      ) {

        updates.serviceTypes =
          Array.isArray(
            updates.serviceTypes
          )

            ? [
                ...new Set(
                  updates.serviceTypes
                    .filter(
                      (item) =>
                        typeof item ===
                          "string" &&
                        item.trim()
                    )
                    .map(
                      (item) =>
                        normalizeString(
                          item
                        )
                    )
                ),
              ]

            : [];

      }


      /* =====================================================
         SERVICE COVERAGE
      ===================================================== */

      if (
        updates.serviceCoverage !==
        undefined
      ) {

        if (
          !updates.serviceCoverage ||
          typeof updates.serviceCoverage !==
            "object"
        ) {

          updates.serviceCoverage = {

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

          };

        }

      }


      /* =====================================================
         PAYMENT OPTIONS
      ===================================================== */

      if (
        updates.paymentOptions !==
        undefined
      ) {

        updates.paymentOptions =
          Array.isArray(
            updates.paymentOptions
          )

            ? [
                ...new Set(
                  updates.paymentOptions
                    .filter(
                      (option) =>
                        typeof option ===
                          "string" &&
                        option.trim()
                    )
                    .map(
                      (option) =>
                        normalizeString(
                          option
                        )
                    )
                ),
              ]

            : [];

      }


      /* =====================================================
         FOOD TYPE
      ===================================================== */

      if (
        updates.foodType !==
        undefined
      ) {

        updates.foodType =
          normalizeString(
            updates.foodType
          ) || "";

      }


      /* =====================================================
         ARRAY FIELDS
      ===================================================== */

      const arrayFields = [

        "pricing",
        "catalog",
        "menu",
        "faq",
        "offers",
        "tags",
        "keywords",
        "images",

      ];


      for (
        const field of arrayFields
      ) {

        if (
          updates[field] !==
          undefined
        ) {

          updates[field] =
            normalizeArray(
              updates[field]
            );

        }

      }


      /* =====================================================
         RESTAURANT BOOKING
      ===================================================== */

      if (
        updates.restaurantBooking !==
        undefined
      ) {

        const booking =
          updates.restaurantBooking;


        updates.restaurantBooking =
          booking &&
          typeof booking ===
            "object"

            ? {

                enabled:
                  Boolean(
                    booking.enabled
                  ),

                totalTables:
                  Math.max(
                    0,
                    Number(
                      booking.totalTables
                    ) || 0
                  ),

                seatingCapacity:
                  Math.max(
                    0,
                    Number(
                      booking.seatingCapacity
                    ) || 0
                  ),

                advanceBookingDays:
                  Math.max(
                    0,
                    Number(
                      booking.advanceBookingDays
                    ) || 0
                  ),

              }

            : {

                enabled:
                  false,

                totalTables:
                  0,

                seatingCapacity:
                  0,

                advanceBookingDays:
                  0,

              };

      }


      /* =====================================================
         ROOM BOOKING
      ===================================================== */

      if (
        updates.roomBooking !==
        undefined
      ) {

        const booking =
          updates.roomBooking;


        updates.roomBooking =
          booking &&
          typeof booking ===
            "object"

            ? {

                enabled:
                  Boolean(
                    booking.enabled
                  ),

                totalRooms:
                  Math.max(
                    0,
                    Number(
                      booking.totalRooms
                    ) || 0
                  ),

                advanceBookingDays:
                  Math.max(
                    0,
                    Number(
                      booking.advanceBookingDays
                    ) || 0
                  ),

              }

            : {

                enabled:
                  false,

                totalRooms:
                  0,

                advanceBookingDays:
                  0,

              };

      }


      /* =====================================================
         PARTY BOOKING
      ===================================================== */

      if (
        updates.partyBooking !==
        undefined
      ) {

        const party =
          updates.partyBooking;


        updates.partyBooking =
          party &&
          typeof party ===
            "object"

            ? {

                enabled:
                  Boolean(
                    party.enabled
                  ),

                bookingTypes:
                  Array.isArray(
                    party.bookingTypes
                  )
                    ? party.bookingTypes
                    : [],

                minGuests:
                  Math.max(
                    0,
                    Number(
                      party.minGuests
                    ) || 0
                  ),

                maxGuests:
                  Math.max(
                    0,
                    Number(
                      party.maxGuests
                    ) || 0
                  ),

                capacity:
                  Math.max(
                    0,
                    Number(
                      party.capacity
                    ) || 0
                  ),

                advanceAmount:
                  Math.max(
                    0,
                    Number(
                      party.advanceAmount
                    ) || 0
                  ),

                advanceBookingDays:
                  Math.max(
                    0,
                    Number(
                      party.advanceBookingDays
                    ) || 0
                  ),

                bookingNotice:
                  normalizeString(
                    party.bookingNotice
                  ) || "24h",

                timeSlots:
                  Array.isArray(
                    party.timeSlots
                  )
                    ? party.timeSlots
                    : [],

                contactNumber:
                  normalizeString(
                    party.contactNumber
                  ) || "",

                whatsappBooking:
                  Boolean(
                    party.whatsappBooking
                  ),

                notes:
                  normalizeString(
                    party.notes
                  ) || "",

              }

            : {

                enabled:
                  false,

                bookingTypes:
                  [],

                minGuests:
                  0,

                maxGuests:
                  0,

                capacity:
                  0,

                advanceAmount:
                  0,

                advanceBookingDays:
                  0,

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

              };

      }


      /* =====================================================
         BOOLEAN FEATURES
      ===================================================== */

      if (
        updates.homeService !==
        undefined
      ) {

        updates.homeService =
          Boolean(
            updates.homeService
          );

      }


      if (
        updates.boost !==
        undefined
      ) {

        updates.boost =
          Boolean(
            updates.boost
          );

      }


      if (
        updates.isFeatured !==
        undefined
      ) {

        updates.isFeatured =
          Boolean(
            updates.isFeatured
          );

      }


      if (
        updates.isVerified !==
        undefined
      ) {

        updates.isVerified =
          Boolean(
            updates.isVerified
          );

      }


      /* =====================================================
         GEO UPDATE DETECTION
      ===================================================== */

      const currentAddress = {

        street:
          normalizeString(
            business.address?.street
          ) || "",

        area:
          normalizeString(
            business.address?.area
          ) || "",

        landmark:
          normalizeString(
            business.address?.landmark
          ) || "",

      };


      const nextAddress =
        updates.address !== undefined

          ? {

              street:
                normalizeString(
                  updates.address?.street
                ) || "",

              area:
                normalizeString(
                  updates.address?.area
                ) || "",

              landmark:
                normalizeString(
                  updates.address?.landmark
                ) || "",

            }

          : currentAddress;


      const addressActuallyChanged =
        JSON.stringify(
          currentAddress
        ) !==
        JSON.stringify(
          nextAddress
        );


      const cityActuallyChanged =
        updates.cityId !== undefined &&
        String(
          updates.cityId
        ) !==
        String(
          business.cityId
        );


      const districtActuallyChanged =
        updates.district !== undefined &&
        normalizeString(
          updates.district
        ) !==
        normalizeString(
          business.district
        );


      const stateActuallyChanged =
        updates.state !== undefined &&
        normalizeString(
          updates.state
        ) !==
        normalizeString(
          business.state
        );


      const pincodeActuallyChanged =
        updates.pincode !== undefined &&
        String(
          updates.pincode
        ) !==
        String(
          business.pincode
        );


      const addressChanged =
        addressActuallyChanged ||
        cityActuallyChanged ||
        districtActuallyChanged ||
        stateActuallyChanged ||
        pincodeActuallyChanged;


      /* =====================================================
         ADDRESS → GEOLOCATION
      ===================================================== */

      if (
        addressChanged
      ) {

        const finalAddress =
          updates.address !== undefined
            ? updates.address
            : business.address || {};


        const fullAddress = [

          finalAddress?.street,

          finalAddress?.landmark,

          finalAddress?.area,

          city?.name ||
          business.cityName,

          updates.district !== undefined
            ? updates.district
            : business.district,

          updates.state !== undefined
            ? updates.state
            : business.state,

          updates.pincode !== undefined
            ? updates.pincode
            : business.pincode,

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
              updates.district !== undefined
                ? updates.district
                : business.district,

            state:
              updates.state !== undefined
                ? updates.state
                : business.state,

            pincode:
              updates.pincode !== undefined
                ? updates.pincode
                : business.pincode,

            country:
              updates.country !== undefined
                ? updates.country
                : business.country ||
                  "India",

          });


        if (
          addressLocation?.location
        ) {

          updates.location =
            addressLocation.location;

        }

      }


      /* =====================================================
         SEO
      ===================================================== */

      const finalCityName =
        city?.name ||
        business.cityName ||
        "";


      const finalCategoryName =
        category?.name ||
        "";


      const finalAddress =
        updates.address ||
        business.address ||
        {};


      const finalBusinessName =
        updates.name !== undefined
          ? updates.name
          : business.name;


      const finalDescription =
        updates.description !==
        undefined

          ? updates.description

          : business.description ||
            "";


      const finalIsVerified =
        updates.isVerified !==
        undefined

          ? updates.isVerified

          : business.isVerified ||
            false;


      const finalCitySlug =
        city?.slug ||
        business.citySlug ||
        "";


      const finalCategorySlug =
        category?.slug ||
        business.categorySlug ||
        "";


      const finalBusinessSlug =
        updates.slug ||
        business.slug ||
        "";


      const seoMeta =
        generateMeta({

          city:
            finalCityName,

          category:
            finalCategoryName,

          businessName:
            finalBusinessName,

          area:
            finalAddress?.area ||
            "",

          description:
            finalDescription,

          isVerified:
            finalIsVerified,

          citySlug:
            finalCitySlug,

          categorySlug:
            finalCategorySlug,

          businessSlug:
            finalBusinessSlug,

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
         FINAL COUNTRY CACHE
      ===================================================== */

      updates.country =
        normalizeString(
          updates.country !== undefined
            ? updates.country
            : business.country
        ) || "India";


      updates.countryCode =
        String(
          updates.countryCode !== undefined
            ? updates.countryCode
            : business.countryCode || "IN"
        )
          .trim()
          .toUpperCase();


      /* =====================================================
         DATABASE UPDATE
         Keep $set data separate from MongoDB operators
      ===================================================== */

      const updateOperation = {

        $set:
          updates,

      };


      /* =====================================================
         MERGE URL HISTORY OPERATORS
      ===================================================== */

      if (
        updateOperators.$push
      ) {

        updateOperation.$push =
          updateOperators.$push;

      }


      if (
        updateOperators.$addToSet
      ) {

        updateOperation.$addToSet =
          updateOperators.$addToSet;

      }


      /* =====================================================
         DATABASE UPDATE
      ===================================================== */

      const updated =
        await Business.findByIdAndUpdate(

          id,

          updateOperation,

          {

            new:
              true,

            runValidators:
              true,

            context:
              "query",

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
         SAFETY CHECK
      ===================================================== */

      if (!updated) {

        return res.status(404).json({

          success: false,

          message:
            "Business not found after update",

        });

      }


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