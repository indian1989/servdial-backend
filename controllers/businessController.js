//backend/controllers/businessController.js
import asyncHandler from "express-async-handler";
import mongoose from "mongoose";

import Business from "../models/Business.js";
import City from "../models/City.js";
import Category from "../models/Category.js";
import Review from "../models/Review.js";
import { normalizeBusinessHours } from "../utils/normalizeBusinessHours.js";
import { rankBusinesses } from "../services/ranking/unifiedRankingEngine.js";
import { pingGoogleSitemap } from "../utils/pingSitemap.js";
import { geocodeAddress } from "../services/geocodeService.js";
import generateBusinessFAQ from "../utils/generateBusinessFAQ.js";
import generateMeta from "../utils/seoMeta.js";

import slugify from "../utils/slugify.js";

/* =========================
   CORE VALIDATION HELPERS
========================= */

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const requireField = (field, name) => {
  if (!field || (typeof field === "string" && !field.trim())) {
    throw new Error(`${name} is required`);
  }
};


/* =========================================================
   SLUG GENERATOR — CITY + AREA AWARE
========================================================= */

const generateBusinessSlug = async (
  name,
  cityId,
  area
) => {

  const base =
    slugify(name) ||
    "business";


  const normalizedArea =
    typeof area === "string"
      ? slugify(area)
      : "";


  /* =======================================================
     FIND EXISTING BUSINESSES IN SAME CITY
  ======================================================= */

  const sameCityBusinesses =
    await Business.find({
      cityId,
      isDeleted: false,
    })
      .select("slug slugHistory address")
      .lean();


  /* =======================================================
     HELPER — CHECK SLUG
  ======================================================= */

  const slugExists = (candidate) => {

    return sameCityBusinesses.some(
      (business) =>

        business.slug === candidate ||

        (
          Array.isArray(business.slugHistory) &&
          business.slugHistory.includes(candidate)
        )
    );

  };


  /* =======================================================
     1. BASE SLUG AVAILABLE IN THIS CITY
     
     Example:
     Patna:
       apollo-pharmacy

     Hajipur:
       apollo-pharmacy
  ======================================================= */

  if (!slugExists(base)) {

    return base;

  }


  /* =======================================================
     2. SAME CITY + AREA
     
     Example:
     apollo-pharmacy-kankarbagh
  ======================================================= */

  if (normalizedArea) {

    const areaBase =
      `${base}-${normalizedArea}`;


    /* -----------------------------------------------
       Area slug available
    ----------------------------------------------- */

    if (!slugExists(areaBase)) {

      return areaBase;

    }


    /* -----------------------------------------------
       Same city + same area
       
       apollo-pharmacy-kankarbagh-2
       apollo-pharmacy-kankarbagh-3
       ...
    ----------------------------------------------- */

    let counter = 2;

    let candidate =
      `${areaBase}-${counter}`;


    while (slugExists(candidate)) {

      counter++;

      candidate =
        `${areaBase}-${counter}`;

    }


    return candidate;

  }


  /* =======================================================
     3. SAME CITY + AREA NOT AVAILABLE
     
     apollo-pharmacy-2
     apollo-pharmacy-3
     ...
  ======================================================= */

  let counter = 2;

  let candidate =
    `${base}-${counter}`;


  while (slugExists(candidate)) {

    counter++;

    candidate =
      `${base}-${counter}`;

  }


  return candidate;

};

/* =========================
   CREATE BUSINESS (LOCKED SSOT)
========================= */

export const createBusiness = asyncHandler(async (req, res) => {

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


  /* ================= VALIDATION ================= */

  try {

    requireField(name, "Business name");
    requireField(categoryId, "Category");
    requireField(cityId, "City");
    requireField(pincode, "Pincode");
    requireField(phone, "Phone");

  } catch (err) {

    return res.status(400).json({
      success:false,
      message:err.message,
    });

  }


  if (!isValidObjectId(categoryId)) {
    return res.status(400).json({
      success:false,
      message:"Invalid categoryId",
    });
  }


  if (!isValidObjectId(cityId)) {
    return res.status(400).json({
      success:false,
      message:"Invalid cityId",
    });
  }



  const cleanPincode =
    String(pincode).replace(/\D/g,"");


  if(cleanPincode.length !== 6){

    return res.status(400).json({
      success:false,
      message:"Pincode must be 6 digits",
    });

  }


    // ================= COUNTRY PHONE CODE =================
const cleanPhoneCode = String(phoneCode || "+91")
.replace(/[^\d+]/g, "")
.trim();

const normalizedPhoneCode = cleanPhoneCode.startsWith("+")
 ? cleanPhoneCode
 : `+${cleanPhoneCode}`;

// ================= MAIN MOBILE =================
const cleanPhone = String(phone || "")
  .replace(/\D/g, "")
  .slice(-10);

if (cleanPhone.length !== 10) {
  return res.status(400).json({
    success: false,
    message: "Main mobile number must be 10 digits",
  });
}

// Store with country code
const fullPhone = `${normalizedPhoneCode}${cleanPhone}`;

// ================= WHATSAPP =================
const cleanWhatsapp = whatsapp
  ? String(whatsapp).replace(/\D/g, "").slice(-10)
  : cleanPhone;

if (cleanWhatsapp.length !== 10) {
  return res.status(400).json({
    success: false,
    message: "WhatsApp number must be 10 digits",
  });
}

const fullWhatsapp =
  `${normalizedPhoneCode}${cleanWhatsapp}`;

// ================= LANDLINE (OPTIONAL) =================
const cleanLandline = landline
  ? String(landline).replace(/\D/g, "")
  : "";

if (
  cleanLandline &&
  (cleanLandline.length < 6 ||
   cleanLandline.length > 12)
) {
  return res.status(400).json({
    success: false,
    message:
      "Landline number must be between 6 and 12 digits",
  });
}

const fullLandline = cleanLandline
  ? `${normalizedPhoneCode}${cleanLandline}`
  : "";

// ================= EXTRA MOBILE (OPTIONAL) =================
const cleanAlternatePhone = alternatePhone
  ? String(alternatePhone)
      .replace(/\D/g, "")
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

const fullAlternatePhone = cleanAlternatePhone
  ? `${normalizedPhoneCode}${cleanAlternatePhone}`
  : "";



  /* ================= RESOLVE CITY ================= */

  const city = await City.findById(cityId);


  if(!city){

    return res.status(404).json({
      success:false,
      message:"City not found",
    });

  }



  /* ================= RESOLVE CATEGORY ================= */

  const category =
    await Category.findById(categoryId);



  if(!category){

    return res.status(404).json({
      success:false,
      message:"Category not found",
    });

  }




  /* ================= ADDRESS NORMALIZE ================= */


  const safeAddress = {

    street:
      address?.street?.trim() || "",

    area:
      address?.area?.trim() || "",

    landmark:
      address?.landmark?.trim() || "",

  };



  // Full address for geocoding

  const fullAddress = [

    safeAddress.street,
    safeAddress.landmark,
    safeAddress.area,
    city.name,
    district,
    state,
    cleanPincode

  ]
  .filter(Boolean)
  .join(", ");





  /* ================= LOCATION ================= */


  let safeLocation = null;


  if(
    location &&
    location.type === "Point" &&
    Array.isArray(location.coordinates) &&
    location.coordinates.length === 2
  ){

    const lng =
      Number(location.coordinates[0]);

    const lat =
      Number(location.coordinates[1]);


    if(
      !isNaN(lat) &&
      !isNaN(lng) &&
      lat >= -90 &&
      lat <=90 &&
      lng >=-180 &&
      lng<=180
    ){

      safeLocation={
        type:"Point",
        coordinates:[
          lng,
          lat
        ],
      };

    }

  }




  // fallback city location

  let finalLocation = safeLocation;

// Try address geocoding only if GPS / map location not provided
if (!finalLocation) {
  const addressLocation = await geocodeAddress({
    address: fullAddress,
    city: city.name,
    district,
    state,
    pincode: cleanPincode,
    country: country || "India",
  });

  if (addressLocation?.location) {
    finalLocation = addressLocation.location;
  }
}

// Last fallback: city center
if (!finalLocation) {
  const cityLat = Number(city.latitude);
  const cityLng = Number(city.longitude);

  if (
    !isNaN(cityLat) &&
    !isNaN(cityLng)
  ) {
    finalLocation = {
      type: "Point",
      coordinates: [cityLng, cityLat],
    };
  }
}

if (!finalLocation) {
  return res.status(400).json({
    success: false,
    message: "Valid location required",
  });
}


  /* ================= CREATE ================= */

const slug =
  await generateBusinessSlug(
    name,
    cityId,
    safeAddress.area
  );


  const status =
    req.user?.role === "admin" ||
    req.user?.role === "superadmin"
      ? "approved"
      : "pending";


    // ================= SEO AUTO GENERATION =================

    const seoMeta = generateMeta({
  city: city.name,
  category: category.name,
  businessName: name,
  area: safeAddress.area,
  description: description || "",
  isVerified: false,

  citySlug: city.slug,
  categorySlug: category.slug,
  businessSlug: slug,
});



  const business =
    await Business.create({


      name:name.trim(),


      categoryId,

      cityId,


      cityName:
        city.name.toLowerCase(),


      citySlug:
        city.slug,


      categorySlug:
        category.slug,


      slug,



      // 🔥 NEW ADDRESS OBJECT

      address:safeAddress,



      district:
        district || city.district || "",


      state:
        state || city.state || "",

        // Country info
      country: country || "India",
      countryCode: countryCode || "IN",


      pincode:
        cleanPincode,

      // Phone dialing code
      phoneCountryCode: normalizedPhoneCode,

      phone: fullPhone,

      whatsapp: fullWhatsapp,

      landline: fullLandline,

      alternatePhone: fullAlternatePhone,


      website:
        website || "",


      description:
        description || "",

      foodType: foodType || "",
      pricing: Array.isArray(pricing) ? pricing : [],
      catalog: Array.isArray(catalog) ? catalog : [],
      menu: Array.isArray(menu) ? menu : [],
      faq: Array.isArray(faq) ? faq : [],
      offers: Array.isArray(offers) ? offers : [],
      tags: Array.isArray(tags) ? tags : [],


        seo: {
          title: seoMeta.title,
          description: seoMeta.description,
          keywords: seoMeta.keywords,
          h1: seoMeta.h1,
        },

      location: finalLocation,


      logo:
        logo || "",


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
                  typeof service.name === "string" &&
                  service.name.trim()
              )
              .map((service) => ({
                name: service.name.trim(),
                description:
                  typeof service.description === "string"
                    ? service.description.trim()
                    : "",
              }))
          : [],

          // SERVICE TYPES
        serviceTypes:
          Array.isArray(serviceTypes)
            ? serviceTypes
            : [],

        // SERVICE COVERAGE
        serviceCoverage:
          serviceCoverage || {
            type: "city",
            mode: "selected",
            cities: [],
            states: [],
            countries: [],
          },


  restaurantBooking:
  restaurantBooking || {
    enabled: false,
    totalTables: "",
    seatingCapacity: "",
    advanceBookingDays: "",
  },
  
  partyBooking:
  partyBooking || {
    enabled: false,
    bookingTypes: [],
    minGuests: "",
    maxGuests: "",
    advanceAmount: "",
    bookingNotice: "24h",
    timeSlots: [],
    contactNumber: "",
    whatsappBooking: false,
    notes: "",
  },

      businessHours:
        normalizeBusinessHours(
          businessHours || {}
        ),

  boost: Boolean(boost),
  
  isFeatured: Boolean(isFeatured),
  isVerified:
    req.user?.role === "admin" ||
    req.user?.role === "superadmin"
    ? true
    : Boolean(isVerified),

      status,


    });


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



  await pingGoogleSitemap();



  res.status(201).json({

    success:true,

    data:populatedBusiness,

  });


});

/* =========================================================
   UPDATE BUSINESS HOURS (PROVIDER)
========================================================= */
export const updateBusinessHours = asyncHandler(async (req, res) => {
  const { businessId, businessHours } = req.body;
  const userId = req.user?._id;

  if (!businessId || !businessHours) {
    return res.status(400).json({
      success: false,
      message: "Business ID and businessHours required",
    });
  }

  const business = await Business.findById(businessId);

  if (!business) {
    return res.status(404).json({
      success: false,
      message: "Business not found",
    });
  }

  // ownership check (important security layer)
  if (String(business.owner) !== String(userId)) {
    return res.status(403).json({
      success: false,
      message: "Unauthorized access",
    });
  }

  // basic safe merge (no schema break risk)
  business.businessHours = normalizeBusinessHours({
  ...business.businessHours,
  ...businessHours,
});

  await business.save();

  return res.json({
    success: true,
    message: "Business hours updated successfully",
    data: business.businessHours,
  });
});

/* =========================
   GET BUSINESSES (BASE)
========================= */

export const getBusinesses = asyncHandler(async (req, res) => {
  const {
    city,
    category,
    page = 1,
    limit = 20,
  } = req.query;
  
  const query = {
    status: "approved",
    isDeleted: false,
  };
  
  if (city) {
    const cityDoc = await City.findOne({
      slug: city,
      status: "active",
    }).select("_id");
    
    if (cityDoc) {
      query.cityId = cityDoc._id;
    }
  }
  
  if (category) {
    const categoryDoc = await Category.findOne({
      slug: category,
      status: "active",
    }).select("_id");
    
    if (categoryDoc) {
      query.categoryId = categoryDoc._id;
    }
  }
  
  const skip =
  (Number(page) - 1) * Number(limit);
  
  const [businesses, total] =
  await Promise.all([
    Business.find(query)
    .select("+location")
    .populate( "cityId",
      "name slug district state country latitude longitude"
    )
    .populate(
      "categoryId",
      "name slug uiType features"
    )
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit))
    .lean(),
    
    Business.countDocuments(query),
  ]);
  res.json({
    success: true,
    data: businesses,
    meta: {
      total,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / Number(limit)),
    },
  });
});

/* =========================
   GET SINGLE BUSINESS
========================= */

export const getBusinessById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    return res.status(400).json({
  success: false,
  message: "Invalid business id",
});
  }

  const business = await Business.findById(id)
    .populate("cityId")
    .populate("categoryId");

  if (!business) {
    return res.status(404).json({
  success: false,
  message: "Business not found",
});
  }

  res.json({
    success: true,
    data: business,
  });
});

/* =========================================================
   CLAIM BUSINESS (PROVIDER FLOW)
========================================================= */
export const claimBusiness = asyncHandler(async (req, res) => {
  const businessId = req.params.id;
  const userId = req.user?._id;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "Login required",
    });
  }

  const business = await Business.findById(businessId);

  if (!business) {
    return res.status(404).json({
      success: false,
      message: "Business not found",
    });
  }

  if (business.isClaimed) {
    return res.status(400).json({
      success: false,
      message: "Business already claimed",
    });
  }

  // assign claim user
business.claimedBy = userId;

business.claimStatus = "pending";

business.isClaimed = false;

await business.save();

  return res.json({
    success: true,
    message: "Business claim submitted for approval",
    data: business,
  });
});

/* =========================
   UPDATE BUSINESS (STRICT LOCK)
========================= */

export const updateBusiness = asyncHandler(async (req, res) => {

  const { id } = req.params;


  if (!isValidObjectId(id)) {
    return res.status(400).json({
      success:false,
      message:"Invalid business id",
    });
  }


  const business =
    await Business.findById(id);


  if (!business) {
    return res.status(404).json({
      success:false,
      message:"Business not found",
    });
  }



  const updates = {
    ...req.body
  };


  console.log(
    "🔥 UPDATE BODY:",
    req.body
  );


/* ================= HARD PROTECTION ================= */

// These fields are completely system-controlled.
// Client must never modify them directly.

delete updates.slug;
delete updates.slugHistory;

delete updates.citySlug;
delete updates.categorySlug;

delete updates.status;

  /* ================= ADDRESS NORMALIZE ================= */


  if(updates.address){

    // New format

    if(typeof updates.address === "object"){

      updates.address = {

        street:
          updates.address.street?.trim() || "",

        area:
          updates.address.area?.trim() || "",

        landmark:
          updates.address.landmark?.trim() || "",

      };

    }


    // Old format support

    else if(typeof updates.address === "string"){

      updates.address = {

        street:
          updates.address.trim(),

        area:"",
        landmark:"",

      };

    }

  }




  /* ================= PINCODE ================= */


  if(updates.pincode){

    updates.pincode =
      String(updates.pincode)
      .replace(/\D/g,"");


    if(updates.pincode.length !== 6){

      return res.status(400).json({

        success:false,

        message:"Invalid pincode",

      });

    }

  }


    // ================= PHONE UPDATE =================
    if (updates.phone) {
      const cleanPhone = String(updates.phone)
      .replace(/\D/g, "")
      .slice(-10);
      if (cleanPhone.length !== 10) {
        return res.status(400).json({
          success: false,
          message: "Invalid phone number",
        });
      }
      
      const phoneCode = String(
        updates.phoneCode || business.phoneCode || "+91"
      ).replace(/[^\d+]/g, "");
      
      const normalizedCode = phoneCode.startsWith("+")
      ? phoneCode
      : `+${phoneCode}`;
      
      updates.phone = `${normalizedCode}${cleanPhone}`;
    }

    // WhatsApp update
    if (updates.whatsapp) {
      const clean = String(updates.whatsapp).replace(/\D/g, "").slice(-10);
      if (clean.length !== 10) {
        return res.status(400).json({
          success: false,
          message: "Invalid WhatsApp number",
        });
      }
      
      const code = updates.phoneCode || business.phoneCode || "+91";
      updates.whatsapp = `${code}${clean}`;
    }
    
    // Alternate mobile update
    if (updates.alternatePhone) {
      const clean = String(updates.alternatePhone).replace(/\D/g, "").slice(-10);
      if (clean.length !== 10) {
        return res.status(400).json({
          success: false,
          message: "Invalid alternate mobile number",
        });
      }
      
      const code = updates.phoneCode || business.phoneCode || "+91";
      updates.alternatePhone = `${code}${clean}`;
    }

    /* ================= CITY RESOLVE ================= */
  let city = null;
  let category = null;  


  if(updates.cityId){


    if(!isValidObjectId(updates.cityId)){

      return res.status(400).json({

        success:false,

        message:"Invalid cityId",

      });

    }

    city =
      await City.findById(
        updates.cityId
      );


    if(!city){

      return res.status(404).json({

        success:false,

        message:"City not found",

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


    if (!category) {
    category = await Category.findById(
      business.categoryId
    );
  }


 // ================= CATEGORY RESOLVE =================

if (updates.categoryId) {

  if (!isValidObjectId(updates.categoryId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid categoryId",
    });
  }

  category = await Category.findById(
    updates.categoryId
  );

  if (!category) {
    return res.status(404).json({
      success: false,
      message: "Category not found",
    });
  }

  updates.categorySlug =
    category.slug;

} else {

  category = await Category.findById(
    business.categoryId
  );

}

/* =========================================================
   BUSINESS SLUG — CITY + AREA AWARE
========================================================= */

const nameChanged =
  updates.name !== undefined &&
  updates.name.trim() !== business.name.trim();


const cityChanged =
  updates.cityId !== undefined &&
  String(updates.cityId) !== String(business.cityId);


const areaChanged =
  updates.address !== undefined &&
  (
    (updates.address?.area || "").trim() !==
    (business.address?.area || "").trim()
  );


/*
 * Slug regenerate only when something that affects
 * business identity in the URL changes.
 */

if (
  nameChanged ||
  cityChanged ||
  areaChanged
) {

  /* ================= CLEAN NAME ================= */

  const finalName =
    updates.name !== undefined
      ? updates.name
          .trim()
          .replace(/\s+/g, " ")
      : business.name;


  /* ================= FINAL CITY ================= */

  const finalCityId =
    updates.cityId ||
    business.cityId;


  /* ================= FINAL AREA ================= */

  const finalArea =
    updates.address?.area !== undefined
      ? updates.address.area
      : business.address?.area || "";


  /* ================= GENERATE NEW SLUG ================= */

  const newSlug =
    await generateBusinessSlug(
      finalName,
      finalCityId,
      finalArea
    );


  /* ================= SAVE NAME ================= */

  updates.name =
    finalName;


  /* ================= SAVE OLD SLUG ================= */

  if (
    business.slug &&
    business.slug !== newSlug
  ) {

    updates.$addToSet = {
      ...(updates.$addToSet || {}),
      slugHistory:
        business.slug,
    };

  }


  /* ================= SAVE NEW SLUG ================= */

  updates.slug =
    newSlug;

}

  /* ================= HOURS ================= */


  if(updates.businessHours){

    updates.businessHours =
      normalizeBusinessHours(
        updates.businessHours
      );

  }

  /* ================= GEO UPDATE ================= */


  const addressChanged =
    updates.address ||
    updates.cityId ||
    updates.district ||
    updates.state ||
    updates.pincode;

    // ================= SEO AUTO GENERATION =================

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

    const seoMeta = generateMeta({
  city: finalCity,
  category: finalCategory,
  businessName: updates.name || business.name,

  area: finalAddress?.area || "",

  description:
    updates.description !== undefined
      ? updates.description
      : business.description || "",

  isVerified:
    updates.isVerified !== undefined
      ? updates.isVerified
      : business.isVerified || false,

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
      title: seoMeta.title,
      description: seoMeta.description,
      keywords: seoMeta.keywords,
      h1: seoMeta.h1,
    };

  if(addressChanged){

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
      business.pincode

    ]
    .filter(Boolean)
    .join(", ");




    const addressLocation =
      await geocodeAddress({

        address:fullAddress,

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



    if (!updates.location && addressLocation?.location) {
      updates.location = addressLocation.location;
    }

  }

  if (updates.pricing && !Array.isArray(updates.pricing)) {
    updates.pricing = [];
  }
  
  if (updates.menu && !Array.isArray(updates.menu)) {
    updates.menu = [];
  }
  
  if (updates.catalog && !Array.isArray(updates.catalog)) {
    updates.catalog = [];
  }
  
  if (updates.faq && !Array.isArray(updates.faq)) {
    updates.faq = [];
  }
  
  if (updates.offers && !Array.isArray(updates.offers)) {
    updates.offers = [];
  }
  
  if (updates.tags && !Array.isArray(updates.tags)) {
    updates.tags = [];
  }
  /* ================= UPDATE ================= */


  const updated =
    await Business.findByIdAndUpdate(

      id,

      updates,

      {
        new:true,
        runValidators:true,
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





  await pingGoogleSitemap();



  res.json({

    success:true,

    data:updated,

  });


});

/* =========================
   DELETE BUSINESS
========================= */

export const deleteBusiness = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // ✅ Validate ID
  if (!isValidObjectId(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid business id",
    });
  }

  const deleted = await Business.findByIdAndDelete(id);

  if (!deleted) {
    return res.status(404).json({
      success: false,
      message: "Business not found",
    });
  }

  await pingGoogleSitemap();

  res.json({
    success: true,
    message: "Business deleted successfully",
    data: null,
  });
});

// ================================
// MANAGE BUSINESS MEDIA
// ================================
export const updateBusinessMedia = asyncHandler(async (req, res) => {
  const business = await Business.findById(req.params.id);

  if (!business) {
    return res.status(404).json({
  success: false,
  message: "Business not found",
});
  }

  business.images = req.body.images || business.images;
  await business.save();

  res.json({
  success: true,
  message: "Business media updated",
  data: business.images,
});
});


// ================= GET BUSINESS BY SLUG =================
export const getBusinessBySlug = asyncHandler(async (req, res) => {

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
      message: "Slug is required",
    });

  }


  /* =====================================================
     STATE
  ===================================================== */

  let business = null;

  let isOldSlug = false;

  let requestedCity = null;

  let requestedCategory = null;


  /* =====================================================
     1. RESOLVE CITY
     
     Only when citySlug exists.
  ===================================================== */

  if (requestedCitySlug) {

    requestedCity =
      await City.findOne({

        slug:
          requestedCitySlug,

        status:
          "active",

      })
      .select(
        "_id name slug state district"
      )
      .lean();


    /*
     * Invalid city in a structured business URL.
     *
     * Do not fall back to another city's business.
     */
    if (!requestedCity) {

      return res.status(404).json({
        success: false,
        message: "City not found",
      });

    }

  }


  /* =====================================================
     2. RESOLVE CATEGORY
     
     Category is part of the public URL.
     We use it to prevent wrong-category URLs.
  ===================================================== */

  if (requestedCategorySlug) {

    requestedCategory =
      await Category.findOne({

        slug:
          requestedCategorySlug,

        status:
          "active",

      })
      .select(
        "_id name slug uiType features"
      )
      .lean();


    /*
     * Invalid category in a structured business URL.
     */
    if (!requestedCategory) {

      return res.status(404).json({
        success: false,
        message: "Category not found",
      });

    }

  }


  /* =====================================================
     3. CURRENT SLUG — CITY AWARE
     
     Example:
     
     Patna:
       apollo-pharmacy
     
     Hajipur:
       apollo-pharmacy
     
     Both are valid because cityId differs.
  ===================================================== */

  if (requestedCity) {

    const query = {

      cityId:
        requestedCity._id,

      slug:
        value,

      status:
        "approved",

      isDeleted:
        false,

    };


    /*
     * If category is present,
     * require matching category as well.
     */
    if (requestedCategory) {

      query.categoryId =
        requestedCategory._id;

    }


    business =
      await Business.findOne(
        query
      );

  }


  /* =====================================================
   4. OLD SLUG — HISTORY LOOKUP
     
   IMPORTANT:
   Do NOT restrict slugHistory by cityId.
   
   Reason:
   Business may have moved to another city.
   
   Example:
   
   OLD:
   Hajipur + old-slug
   
   NEW:
   Patna + new-slug
   
   Old Hajipur URL must still 301
   to the new Patna canonical URL.
===================================================== */

if (!business) {

  const query = {

    slugHistory:
      value,

    status:
      "approved",

    isDeleted:
      false,

  };


  /*
   * Category restriction is still useful
   * because category is part of the old URL.
   */

  if (requestedCategory) {

    query.categoryId =
      requestedCategory._id;

  }


  business =
    await Business.findOne(
      query
    );


  if (business) {

    isOldSlug = true;

  }

}

  /* =====================================================
     5. LEGACY FALLBACK
     
     This is important for EXISTING URLs.
     
     Example:
     
     /api/businesses/apollo-pharmacy
     
     We still allow the old lookup.
     
     IMPORTANT:
     This fallback is used ONLY when citySlug
     was not supplied.
  ===================================================== */

  if (
    !business &&
    !requestedCitySlug
  ) {

    /*
     * CURRENT SLUG
     */

    business =
      await Business.findOne({

        slug:
          value,

        status:
          "approved",

        isDeleted:
          false,

      });


    /*
     * OLD SLUG
     */

    if (!business) {

      business =
        await Business.findOne({

          slugHistory:
            value,

          status:
            "approved",

          isDeleted:
            false,

        });


      if (business) {

        isOldSlug = true;

      }

    }

  }


  /* =====================================================
     6. NOT FOUND
  ===================================================== */

  if (!business) {

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


  if (!populatedBusiness) {

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
     12. OLD SLUG → HTTP 301
     
     IMPORTANT:
     
     This is now a REAL HTTP redirect.
     
     Browser + Google receive:
     
     301 Moved Permanently
  ===================================================== */

  if (isOldSlug) {

  return res.json({

    success: true,

    redirect: true,

    oldSlug: value,

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

      reviews: [],

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

    success: true,

    redirect: false,

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

});

// ================= GET BUSINESS COUNT =================
export const getBusinessCount = asyncHandler(async (req, res) => {
  const { categoryId, cityId } = req.query;

  const filter = {
    status: "approved",
    isDeleted: false,
  };

  if (categoryId) filter.categoryId = categoryId;
  if (cityId) filter.cityId = cityId;

  const count = await Business.countDocuments(filter);

  res.json({
    success: true,
    data: { count },
  });
});

// ================= GET SIMILAR BUSINESS =================
export const getSimilarBusinesses = asyncHandler(async (req, res) => {

  const { id } = req.params;


  if (!isValidObjectId(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid business id",
    });
  }



  const base = await Business.findById(id)
    .select(
      "location cityId categoryId"
    )
    .lean();



  if (!base) {
    return res.status(404).json({
      success:false,
      message:"Base business not found",
    });
  }




  const nearby = await Business.aggregate([


    {
      $geoNear: {

        near: {
          type:"Point",
          coordinates:
            base.location.coordinates
        },


        distanceField:
          "distanceMeters",


        spherical:true,


        query:{

          _id:{
            $ne:base._id
          },


          cityId:
            base.cityId,


          categoryId:
            base.categoryId,


          status:"approved",


          isDeleted:false,

        }

      }

    },


    {
      $limit:20
    },


    {
      $lookup:{
        from:"cities",
        localField:"cityId",
        foreignField:"_id",
        as:"cityId"
      }
    },


    {
      $unwind:{
        path:"$cityId",
        preserveNullAndEmptyArrays:true
      }
    },


    {
      $lookup:{
        from:"categories",
        localField:"categoryId",
        foreignField:"_id",
        as:"categoryId"
      }
    },


    {
      $unwind:{
        path:"$categoryId",
        preserveNullAndEmptyArrays:true
      }
    }


  ]);




  const normalized = nearby.map((b)=>({

    ...b,


    distance:
      Number(
        (b.distanceMeters / 1000)
        .toFixed(1)
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

  }));


const ranked = rankBusinesses(
  normalized,
  { intent: { type: "similar" } }
);

  res.json({

    success:true,

    data:
      ranked.slice(0,8)

  });


});

// ================= Track BUSINESS VIEW =================
export const trackBusinessView = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  if (!isValidObjectId(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid business id",
    });
  }
  await Business.findByIdAndUpdate(
    id,
    {
      $inc: { views: 1 },
      $set: { lastViewedAt: new Date()
      },
    },
    { new: false }
  );
  
  res.json({
    success: true,
    data: null,
  });
});

// ================= TRACK BUSINESS ANALYTICS =========================
export const trackBusinessAnalytics = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { type } = req.body;
  
  if (!isValidObjectId(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid business id",
    });
  }
  
  const fieldMap = {
    call: "phoneClicks",
    whatsapp: "whatsappClicks",
    direction: "directionClicks",
    share: "shareClicks",
    booking: "bookingClicks",
  };
  
  const field = fieldMap[type];
  if (!field) {
    return res.status(400).json({
      success: false,
      message: "Invalid analytics type",
    });
  }
  
  await Business.findByIdAndUpdate(
    id,
    {
      $inc: { [field]: 1 },
    },
    { new: false }
  );
  
  res.json({
    success: true,
    data: null,
  });
});

/* =========================
   GET LATEST BUSINESSES
========================= */

export const getLatestBusinesses = asyncHandler(async (req, res) => {
  const { city, limit = 12 } = req.query;
  
  const filter = {
    status: "approved",
    isDeleted: false,
  };
  
  if (city) {
    const cityDoc = await City.findOne({
      slug: city,
      status: "active",
    }).select("_id");
    
    if (cityDoc) {
      filter.cityId = cityDoc._id;
    }
  }
  
  const businesses = await Business.find(filter)
  .populate("cityId", "name slug")
  .populate( "categoryId", "name slug uiType features" )
  .sort({ createdAt: -1 })
  .limit(Number(limit))
  .lean();
  
  res.json({
    success: true,
    data: businesses,
  });
});