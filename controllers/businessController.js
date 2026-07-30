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


/* =========================
   SLUG GENERATOR (CONTROLLED)
========================= */

const generateBusinessSlug = async (name) => {
  const base = slugify(name);
  let slug = base;
  let counter = 1;

  while (await Business.findOne({ slug })) {
    slug = `${base}-${counter++}`;
  }

  return slug;
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
    website,
    description,
    location,
    logo,
    images,
    businessHours,
    district,
    state,
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



  const cleanPhone =
    String(phone).replace(/\D/g,"");


  if(cleanPhone.length !== 10){

    return res.status(400).json({
      success:false,
      message:"Phone must be 10 digits",
    });

  }



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

  if(!safeLocation){

    const cityLat =
      Number(city.latitude);

    const cityLng =
      Number(city.longitude);



    if(
      !isNaN(cityLat) &&
      !isNaN(cityLng)
    ){

      safeLocation={
        type:"Point",
        coordinates:[
          cityLng,
          cityLat
        ],
      };

    }

  }



  if(!safeLocation){

    return res.status(400).json({
      success:false,
      message:"Valid location required",
    });

  }




  /* ================= CREATE ================= */


  const slug =
    await generateBusinessSlug(name);



  const status =
    req.user?.role === "admin" ||
    req.user?.role === "superadmin"
      ? "approved"
      : "pending";





  /* ================= GEOCODE ================= */


  const addressLocation =
    await geocodeAddress({

      address: fullAddress,

      city: city.name,

      district,

      state,

      pincode: cleanPincode,

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


      pincode:
        cleanPincode,



      phone:
        cleanPhone,


      whatsapp:
        whatsapp || "",


      website:
        website || "",


      description:
        description || "",



      location:
        addressLocation?.location ||
        safeLocation,



      logo:
        logo || "",


      images:
        Array.isArray(images)
          ? images
          : [],



      businessHours:
        normalizeBusinessHours(
          businessHours || {}
        ),



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

  console.log(
    "🔥🔥🔥 GET BUSINESSES CONTROLLER HIT 🔥🔥🔥"
  );

  const businesses = await Business.find({})
    .select("+location")
    .populate("cityId", "name slug latitude longitude")
    .populate(
      "categoryId",
      "name slug uiType features"
    );

  console.log(
    "🔥 TOTAL BUSINESSES:",
    businesses.length
  );

  console.log(
    "🔥 FIRST BUSINESS:",
    JSON.stringify(
      businesses[0],
      null,
      2
    )
  );

  console.log(
    "🔥 FIRST LOCATION:",
    businesses[0]?.location
  );

  res.json({
    success: true,
    data: businesses
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


console.log(
  "CATEGORY FROM BACKEND:",
  business.categoryId
);

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

  delete updates.slug;
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





  /* ================= PHONE ================= */


  if(updates.phone){

    updates.phone =
      String(updates.phone)
      .replace(/\D/g,"");


    if(updates.phone.length !==10){

      return res.status(400).json({

        success:false,

        message:"Invalid phone number",

      });

    }

  }







  /* ================= CITY RESOLVE ================= */


  let city = null;


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







  /* ================= CATEGORY RESOLVE ================= */


  if(updates.categoryId){


    if(!isValidObjectId(updates.categoryId)){

      return res.status(400).json({

        success:false,

        message:"Invalid categoryId",

      });

    }



    const category =
      await Category.findById(
        updates.categoryId
      );



    if(!category){

      return res.status(404).json({

        success:false,

        message:"Category not found",

      });

    }


    updates.categorySlug =
      category.slug;

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



    if(addressLocation?.location){

      updates.location =
        addressLocation.location;

    }

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
  const { slug } = req.params;

  if (!slug) {
    return res.status(400).json({
      success: false,
      message: "Slug is required",
    });
  }

  const business = await Business.findOne({
    slug,
    status: "approved",
    isDeleted: false,
  })
    .populate("cityId", "name slug")
    .populate(
  "categoryId",
  "name slug uiType features"
)
    .lean();

  if (!business) {
    return res.status(404).json({
      success: false,
      message: "Business not found",
    });
  }

  // 🔥 OPTIONAL: fetch reviews here if needed
  const reviews = await Review.find({ businessId: business._id })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  res.json({
  success: true,
  data: {
    business,
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

  // ✅ Validate ID
  if (!isValidObjectId(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid business id",
    });
  }

  // ✅ Get base business
  const base = await Business.findById(id).lean();

  if (!base) {
    return res.status(404).json({
      success: false,
      message: "Base business not found",
    });
  }

  // ✅ Find similar businesses
  const raw = await Business.find({
    _id: { $ne: id },
    cityId: base.cityId,
    categoryId: base.categoryId,
    status: "approved",
    isDeleted: false,
  })

  .populate("cityId", "name slug")
  .populate("categoryId", "name slug")
    .limit(20)
    .lean();

    // Normalize for BusinessCard / DTO
    const normalized = raw.map((b) => ({
      ...b,

      cityName: b.cityName || b.cityId?.name || "",
      citySlug: b.citySlug || b.cityId?.slug || "",

      categoryName: b.categoryName || b.categoryId?.name || "General",
      categorySlug: b.categorySlug || b.categoryId?.slug || "",
      }));

  // ✅ Ranking layer
  const ranked = await rankBusinesses(
    normalized,
    {},
    "",
    {},
    null,
    base.cityId
  );

  // ✅ Final response
  res.json({
    success: true,
    data: ranked.slice(0, 8),
  });
});

// ================= Track BUSINESS VIEW =================
export const trackBusinessView = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // ✅ Validate ID
  if (!isValidObjectId(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid business id",
    });
  }

  const updated = await Business.findByIdAndUpdate(
    id,
    { $inc: { views: 1 } },
    { new: true }
  );

  if (!updated) {
    return res.status(404).json({
      success: false,
      message: "Business not found",
    });
  }

  res.json({
    success: true,
    data: null,
  });
});

// ================= TRACK BUSINESS ANALYTICS =========================
export const trackBusinessAnalytics = asyncHandler(async (req,res)=>{

const {id}=req.params;
const {type}=req.body;


const update={};


switch(type){

case "call":
update.phoneClicks={$inc:1};
break;

case "whatsapp":
update.whatsappClicks={$inc:1};
break;

case "direction":
update.directionClicks={$inc:1};
break;

case "share":
update.shareClicks={$inc:1};
break;

case "booking":
update.bookingClicks={$inc:1};
break;

default:
return res.status(400).json({
success:false,
message:"Invalid analytics type"
});

}


const business = await Business.findByIdAndUpdate(
id,
{
$inc:update
},
{new:true}
);


res.json({
success:true,
data:null
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

  // ================= CITY RESOLVE =================
  if (city) {
    const cityDoc = await City.findOne({
      slug: city,
    }).select("_id");

    if (cityDoc) {
      filter.cityId = cityDoc._id;
    }
  }

  // ================= FETCH =================
  const rawBusinesses = await Business.find(filter)
    .populate("cityId", "name slug")
    .populate(
  "categoryId",
  "name slug uiType features"
)
    .sort({ createdAt: -1 })
    .limit(Number(limit))
    .lean();

  // ================= RANK =================
  const ranked = await rankBusinesses(
    rawBusinesses,
    {},
    "",
    { intent: "latest" },
    req.user?._id || null,
    filter.cityId || null
  );

  // ================= RESPONSE =================
  res.json({
    success: true,
    data: ranked,
  });
});