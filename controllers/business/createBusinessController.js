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
  secondaryCategoryIds,
  cityId,
  pincode,
  address,

  phone,
  phoneCountryCode,

  whatsapp,
  whatsappCountryCode,

  alternatePhone,
  alternatePhoneCountryCode,

  landline,
  landlineCountryCode,

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
  responseTime,
  homeService,
  paymentOptions,
  foodType,
  pricing,
  catalog,
  menu,
  faq,
  offers,
  tags,
  restaurantBooking,
  roomBooking,
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
   RESPONSE TIME
===================================================== */

    let cleanResponseTime = null;

if (
  responseTime !== undefined &&
  responseTime !== null &&
  responseTime !== ""
) {
  const parsedResponseTime = Number(responseTime);

  if (
    !Number.isFinite(parsedResponseTime) ||
    parsedResponseTime < 0
  ) {
    return res.status(400).json({
      success: false,
      message:
        "Response time must be a valid non-negative number",
    });
  }

  cleanResponseTime = parsedResponseTime;
}


 /* =========================================================
   PHONE / LANDLINE HELPERS
========================================================= */

const normalizeCountryCode = (
  value,
  fallback = "+91"
) => {

  const code =
    String(value || fallback)
      .replace(/[^\d+]/g, "")
      .trim();

  if (!code) {
    return fallback;
  }

  return code.startsWith("+")
    ? code
    : `+${code}`;
};


const cleanMobileNumber = (value) => {

  return String(value || "")
    .replace(/\D/g, "")
    .slice(-10);

};


const cleanLandlineNumber = (value) => {

  return String(value || "")
    .replace(/\D/g, "");

};


/* =========================================================
   PHONE COUNTRY CODES
========================================================= */

const normalizedPhoneCountryCode =
  normalizeCountryCode(
    phoneCountryCode,
    "+91"
  );


const normalizedWhatsappCountryCode =
  normalizeCountryCode(
    whatsappCountryCode,
    normalizedPhoneCountryCode
  );


const normalizedAlternatePhoneCountryCode =
  normalizeCountryCode(
    alternatePhoneCountryCode,
    normalizedPhoneCountryCode
  );


const normalizedLandlineCountryCode =
  normalizeCountryCode(
    landlineCountryCode,
    normalizedPhoneCountryCode
  );


/* =========================================================
   MAIN MOBILE
   Optional
========================================================= */

const cleanPhone =
  phone === undefined ||
  phone === null ||
  String(phone).trim() === ""
    ? ""
    : cleanMobileNumber(phone);


/* =========================================================
   MAIN LANDLINE
   Optional
========================================================= */

const cleanLandline =
  landline === undefined ||
  landline === null ||
  String(landline).trim() === ""
    ? ""
    : cleanLandlineNumber(landline);


/* =========================================================
   WHATSAPP
   Optional
========================================================= */

const cleanWhatsapp =
  whatsapp === undefined ||
  whatsapp === null ||
  String(whatsapp).trim() === ""
    ? ""
    : cleanMobileNumber(whatsapp);


if (
  cleanWhatsapp &&
  cleanWhatsapp.length !== 10
) {

  return res.status(400).json({

    success: false,

    message:
      "WhatsApp number must be 10 digits",

  });

}


/* =========================================================
   ALTERNATE MOBILE
   Optional
========================================================= */

const cleanAlternatePhone =
  alternatePhone === undefined ||
  alternatePhone === null ||
  String(alternatePhone).trim() === ""
    ? ""
    : cleanMobileNumber(alternatePhone);


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


/* =========================================================
   MAIN MOBILE VALIDATION
========================================================= */

if (
  cleanPhone &&
  cleanPhone.length !== 10
) {

  return res.status(400).json({

    success: false,

    message:
      "Mobile number must be 10 digits",

  });

}


/* =========================================================
   MAIN LANDLINE VALIDATION
========================================================= */

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


/* =========================================================
   MOBILE OR LANDLINE REQUIRED
========================================================= */

if (
  !cleanPhone &&
  !cleanLandline
) {

  return res.status(400).json({

    success: false,

    message:
      "At least one contact number is required: Mobile or Landline",

  });

}

/* =========================================================
   CONTACT DUPLICATE CHECK
   =========================================================

   FINAL RULE:

   PROVIDER:
   - Same provider + same phone/landline
     across multiple businesses = ALLOWED

   - Different provider + same phone/landline
     = BLOCKED

   - Phone ↔ landline cross duplicate
     = BLOCKED

   ADMIN:
   - owner is null
   - Admin does NOT use owner-based duplicate allowance
   - Duplicate contact gives WARNING / RECONFIRMATION
   - Admin can continue only after explicit confirmation

   IMPORTANT:
   This is backend safety.
   Frontend should also check while typing.
========================================================= */

const isAdmin =
  req.user?.role === "admin" ||
  req.user?.role === "superadmin";

const providerId =
  req.user?._id || null;

const duplicateContactNumbers = [
  cleanPhone,
  cleanAlternatePhone,
  cleanLandline,
].filter(Boolean);

if (duplicateContactNumbers.length > 0) {

  /*
  =====================================================
  BUILD CONTACT MATCH QUERY

  A number is considered duplicate if it already exists
  either as phone OR landline.

  Therefore:

  new phone    ↔ existing phone
  new phone    ↔ existing landline
  new landline ↔ existing phone
  new landline ↔ existing landline

  All are considered duplicates.
  =====================================================
  */

  const contactMatch = {
  $or: [
    ...duplicateContactNumbers.map(
      (number) => ({
        phone: number,
      })
    ),

    ...duplicateContactNumbers.map(
      (number) => ({
        alternatePhone: number,
      })
    ),

    ...duplicateContactNumbers.map(
      (number) => ({
        landline: number,
      })
    ),
  ],
};


  /*
  =====================================================
  PROVIDER SIDE
  =====================================================

  Current provider's own businesses are excluded.

  Therefore:

  same provider + same number
      → allowed

  another provider + same number
      → blocked

  owner:null / admin-created business + same number
      → also blocked
  =====================================================
  */

  const duplicateQuery = isAdmin
    ? contactMatch
    : {
        ...contactMatch,
        owner: {
          $ne: providerId,
        },
      };


  const duplicateBusinesses =
    await Business.find(duplicateQuery)
      .select(
        "_id name owner phone landline"
      )
      .limit(10)
      .lean();


  if (duplicateBusinesses.length > 0) {

    /*
    ===================================================
    ADMIN SIDE
    ===================================================

    Admin is allowed to continue only after explicit
    reconfirmation.

    Frontend should first receive this warning and then
    resubmit with:

      confirmDuplicateContact: true

    ===================================================
    */

    if (isAdmin) {

      const confirmed =
        req.body?.confirmDuplicateContact === true;


      if (!confirmed) {

        return res.status(409).json({

          success: false,

          duplicate: true,

          requiresConfirmation: true,

          message:
            "This phone or landline number is already registered with another business. Please reconfirm before creating this business.",

          duplicates:
            duplicateBusinesses.map(
              (business) => ({
                id: business._id,
                name: business.name,
                owner:
                  business.owner || null,
                phone:
                  business.phone || "",
                landline:
                  business.landline || "",
              })
            ),

        });

      }

    }


    /*
    ===================================================
    PROVIDER SIDE
    ===================================================

    Provider gets a hard block.

    Same provider's own businesses were already excluded
    from the query, so this only reaches here when another
    provider/admin-owned business has the number.
    ===================================================
    */

    if (!isAdmin) {

      let duplicateField =
        "contact number";


      const duplicateBusiness =
        duplicateBusinesses[0];


      if (
  cleanPhone &&
  (
    duplicateBusiness.phone === cleanPhone ||
    duplicateBusiness.landline === cleanPhone ||
    duplicateBusiness.alternatePhone === cleanPhone
  )
) {

  duplicateField =
    "mobile number";

} else if (
  cleanAlternatePhone &&
  (
    duplicateBusiness.phone === cleanAlternatePhone ||
    duplicateBusiness.landline === cleanAlternatePhone ||
    duplicateBusiness.alternatePhone === cleanAlternatePhone
  )
) {

  duplicateField =
    "alternate mobile number";

} else if (
  cleanLandline &&
  (
    duplicateBusiness.phone === cleanLandline ||
    duplicateBusiness.landline === cleanLandline ||
    duplicateBusiness.alternatePhone === cleanLandline
  )
) {

  duplicateField =
    "landline number";

}

      return res.status(409).json({

        success: false,

        duplicate: true,

        field:
          duplicateField === "mobile number"
            ? "phone"
            : "landline",

        message:
          `This ${duplicateField} is already registered with another provider.`,

      });

    }

  }

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
   BUSINESS CATEGORY VALIDATION

   FINAL CATEGORY RULE:

   Level 0 → Parent Category
   Level 1 → Sub Category = PRIMARY
   Level 2 → Child / Leaf Category = SECONDARY

   Business.categoryId:
   - Level 1 only

   Business.secondaryCategoryIds:
   - Level 2 only
   - Must belong to selected Level 1
   - Optional
   - Maximum 5
   - Unique
===================================================== */

const categoryLevel =
  Number(category.level);


/* -----------------------------------------------------
   PRIMARY CATEGORY MUST BE LEVEL 1
----------------------------------------------------- */

if (categoryLevel !== 1) {

  return res.status(400).json({

    success: false,

    code:
      "INVALID_PRIMARY_CATEGORY",

    message:
      "Business primary category must be a Sub Category.",

  });

}


/* -----------------------------------------------------
   PRIMARY CATEGORY MUST BELONG TO LEVEL 0
----------------------------------------------------- */

if (
  !category.parentCategory
) {

  return res.status(400).json({

    success: false,

    code:
      "INVALID_CATEGORY_HIERARCHY",

    message:
      "Primary category must belong to a Parent Category.",

  });

}


const parentCategory =
  await Category.findById(
    category.parentCategory
  )
    .select(
      "_id level"
    )
    .lean();


if (
  !parentCategory ||
  Number(parentCategory.level) !== 0
) {

  return res.status(400).json({

    success: false,

    code:
      "INVALID_CATEGORY_HIERARCHY",

    message:
      "Primary category must belong directly to a Parent Category.",

  });

}


/* =====================================================
   SECONDARY CATEGORIES
===================================================== */

let cleanSecondaryCategoryIds = [];


if (
  secondaryCategoryIds !== undefined &&
  secondaryCategoryIds !== null
) {

  /* ---------------------------------------------------
     MUST BE ARRAY
  --------------------------------------------------- */

  if (
    !Array.isArray(
      secondaryCategoryIds
    )
  ) {

    return res.status(400).json({

      success: false,

      code:
        "INVALID_SECONDARY_CATEGORIES",

      message:
        "Secondary categories must be an array.",

    });

  }


  /* ---------------------------------------------------
     MAXIMUM 5
  --------------------------------------------------- */

  if (
    secondaryCategoryIds.length > 5
  ) {

    return res.status(400).json({

      success: false,

      code:
        "SECONDARY_CATEGORY_LIMIT",

      message:
        "A maximum of 5 secondary categories can be selected.",

    });

  }


  /* ---------------------------------------------------
     UNIQUE IDS
  --------------------------------------------------- */

  const uniqueSecondaryIds = [
    ...new Set(
      secondaryCategoryIds.map(
        (id) => String(id)
      )
    ),
  ];


  if (
    uniqueSecondaryIds.length !==
    secondaryCategoryIds.length
  ) {

    return res.status(400).json({

      success: false,

      code:
        "DUPLICATE_SECONDARY_CATEGORY",

      message:
        "Duplicate secondary categories are not allowed.",

    });

  }


  /* ---------------------------------------------------
     VALID OBJECT IDS
  --------------------------------------------------- */

  if (
    uniqueSecondaryIds.some(
      (id) =>
        !isValidObjectId(id)
    )
  ) {

    return res.status(400).json({

      success: false,

      code:
        "INVALID_SECONDARY_CATEGORY",

      message:
        "One or more secondary category IDs are invalid.",

    });

  }


  /* ---------------------------------------------------
     PRIMARY CANNOT BE SECONDARY
  --------------------------------------------------- */

  if (
    uniqueSecondaryIds.includes(
      String(category._id)
    )
  ) {

    return res.status(400).json({

      success: false,

      code:
        "PRIMARY_SECONDARY_CONFLICT",

      message:
        "Primary category cannot also be a secondary category.",

    });

  }


  /* ---------------------------------------------------
     LOAD SECONDARY CATEGORIES
  --------------------------------------------------- */

  const secondaryCategories =
    await Category.find({

      _id: {
        $in:
          uniqueSecondaryIds,
      },

    })
      .select(
        "_id level parentCategory"
      )
      .lean();


  if (
    secondaryCategories.length !==
    uniqueSecondaryIds.length
  ) {

    return res.status(400).json({

      success: false,

      code:
        "INVALID_SECONDARY_CATEGORY",

      message:
        "One or more secondary categories were not found.",

    });

  }


  /* ---------------------------------------------------
     VALIDATE LEVEL + PARENT
  --------------------------------------------------- */

  const invalidSecondary =
    secondaryCategories.find(
      (secondary) =>

        Number(
          secondary.level
        ) !== 2 ||

        String(
          secondary.parentCategory
        ) !==
        String(
          category._id
        )
    );


  if (
    invalidSecondary
  ) {

    return res.status(400).json({

      success: false,

      code:
        "INVALID_SECONDARY_CATEGORY",

      message:
        "Secondary categories must be Child / Leaf Categories belonging to the selected primary category.",

    });

  }


  /* ---------------------------------------------------
     CONVERT TO OBJECT IDS
  --------------------------------------------------- */

  cleanSecondaryCategoryIds =
    uniqueSecondaryIds.map(
      (id) =>
        new mongoose.Types.ObjectId(id)
    );

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

         services:
      Array.isArray(services)
        ? services
        : [],

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

    owner:
  isAdmin
    ? null
    : req.user._id,

    name:
      name.trim(),

    categoryId,

secondaryCategoryIds:
  cleanSecondaryCategoryIds,

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


        phone:
  cleanPhone,

phoneCountryCode:
  normalizedPhoneCountryCode,

whatsapp:
  cleanWhatsapp,

whatsappCountryCode:
  normalizedWhatsappCountryCode,

alternatePhone:
  cleanAlternatePhone,

alternatePhoneCountryCode:
  normalizedAlternatePhoneCountryCode,

landline:
  cleanLandline,

landlineCountryCode:
  normalizedLandlineCountryCode,


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
    enabled: false,
    totalTables: 0,
    seatingCapacity: 0,
    advanceBookingDays: 0,
  },

        roomBooking:
  roomBooking || {
    enabled: false,
    totalRooms: 0,
    advanceBookingDays: 0,
  },


        partyBooking:
  partyBooking ||
  {
    enabled: false,
    bookingTypes: [],
    minGuests: 0,
    maxGuests: 0,
    capacity: 0,
    advanceAmount: 0,
    advanceBookingDays: 0,
    bookingNotice: "24h",
    timeSlots: [],
    contactNumber: "",
    whatsappBooking: false,
    notes: "",
  },


        businessHours:
          normalizeBusinessHours(
            businessHours ||
            {}
          ),

         responseTime:
  cleanResponseTime,

homeService:
  Boolean(homeService),

paymentOptions:
  Array.isArray(paymentOptions)
    ? [
        ...new Set(
          paymentOptions
            .filter(
              (option) =>
                typeof option === "string" &&
                option.trim()
            )
            .map(
              (option) =>
                option.trim()
            )
        ),
      ]
    : [],


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
        )

        .populate(
  "secondaryCategoryIds",
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