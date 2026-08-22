// backend/services/business/businessSlugService.js

import Business from "../../models/Business.js";
import City from "../../models/City.js";
import slugify from "../../utils/slugify.js";

/* =========================================================
   BUSINESS SLUG SERVICE
========================================================= */

/* =========================================================
   GENERATE BUSINESS SLUG
   CITY + AREA + HISTORY AWARE
========================================================= */

export const generateBusinessSlug = async (
  name,
  cityId,
  area
) => {

  /* =======================================================
     BASE SLUG
  ======================================================= */

  const base =
    slugify(name) ||
    "business";


  const normalizedArea =
    typeof area === "string"
      ? slugify(area)
      : "";


  /* =======================================================
     RESOLVE TARGET CITY
  ======================================================= */

  const city =
    await City.findById(cityId)
      .select("slug")
      .lean();


  if (!city?.slug) {

    throw new Error(
      "City slug not found while generating business slug"
    );

  }


  const targetCitySlug =
    city.slug
      .toLowerCase()
      .trim();


  /* =======================================================
     CURRENT BUSINESSES IN TARGET CITY
     
     Used for:
     - current slug
     - slugHistory
  ======================================================= */

  const sameCityBusinesses =
    await Business.find({

      cityId,

      isDeleted: false,

    })
      .select(
        "slug slugHistory urlHistory"
      )
      .lean();


  /* =======================================================
     HISTORICAL URL RESERVATIONS
     
     Businesses may have moved away from this city.
     Their old city URL must remain reserved.
  ======================================================= */

  const historicalCityBusinesses =
    await Business.find({

      isDeleted: false,

      "urlHistory.citySlug":
        targetCitySlug,

    })
      .select(
        "urlHistory"
      )
      .lean();


  /* =======================================================
     CHECK SLUG AVAILABILITY
  ======================================================= */

  const slugExists = (
    candidate
  ) => {

    /* -----------------------------------------------
       CURRENT BUSINESS / OLD SLUG IN TARGET CITY
    ----------------------------------------------- */

    const currentCityConflict =
  sameCityBusinesses.some(
    (business) =>
      business.slug === candidate
  );


    if (currentCityConflict) {
      return true;
    }


    /* -----------------------------------------------
       HISTORICAL URL IN TARGET CITY
    ----------------------------------------------- */

    const historicalConflict =
      historicalCityBusinesses.some(
        (business) =>

          Array.isArray(
            business.urlHistory
          ) &&

          business.urlHistory.some(
            (history) =>

              history?.citySlug ===
                targetCitySlug &&

              history?.slug ===
                candidate
          )
      );


    return historicalConflict;

  };


  /* =======================================================
     1. BASE SLUG
  ======================================================= */

  if (
    !slugExists(base)
  ) {

    return base;

  }


  /* =======================================================
     2. SAME CITY + AREA
  ======================================================= */

  if (
    normalizedArea
  ) {

    const areaBase =
      `${base}-${normalizedArea}`;


    if (
      !slugExists(areaBase)
    ) {

      return areaBase;

    }


    let counter = 2;

    let candidate =
      `${areaBase}-${counter}`;


    while (
      slugExists(candidate)
    ) {

      counter++;

      candidate =
        `${areaBase}-${counter}`;

    }


    return candidate;

  }


  /* =======================================================
     3. SAME CITY + NO AREA
  ======================================================= */

  let counter = 2;

  let candidate =
    `${base}-${counter}`;


  while (
    slugExists(candidate)
  ) {

    counter++;

    candidate =
      `${base}-${counter}`;

  }


  return candidate;

};


/* =========================================================
   URL CHANGE DETECTION
========================================================= */

export const getBusinessUrlChangeState = (
  business = {},
  updates = {}
) => {

  const nameChanged =
    updates.name !== undefined &&
    String(updates.name).trim() !==
      String(business.name || "").trim();


  const cityChanged =
    updates.cityId !== undefined &&
    String(updates.cityId) !==
      String(business.cityId);


  const areaChanged =
    updates.address !== undefined &&
    (
      String(
        updates.address?.area || ""
      ).trim()
      !==
      String(
        business.address?.area || ""
      ).trim()
    );


  const categoryChanged =
    updates.categoryId !== undefined &&
    String(updates.categoryId) !==
      String(business.categoryId);


  /* =======================================================
     URL CHANGES WHEN ANY PUBLIC URL SEGMENT CHANGES
  ======================================================= */

  const urlChanged =
    nameChanged ||
    cityChanged ||
    areaChanged ||
    categoryChanged;


  /* =======================================================
     SLUG CHANGES ONLY FOR:
     - name
     - city
     - area

     Category does NOT change business slug.
  ======================================================= */

  const slugNeedsRegeneration =
    nameChanged ||
    cityChanged ||
    areaChanged;


  return {

    nameChanged,
    cityChanged,
    areaChanged,
    categoryChanged,
    urlChanged,
    slugNeedsRegeneration,

  };

};


/* =========================================================
   BUILD OLD URL HISTORY ENTRY
========================================================= */

export const buildBusinessUrlHistoryEntry = (
  business = {}
) => {

  return {

    slug:
      business.slug || "",

    citySlug:
      business.citySlug || "",

    categorySlug:
      business.categorySlug || "",

    changedAt:
      new Date(),

  };

};


/* =========================================================
   EXPORT
========================================================= */

export default {
  generateBusinessSlug,
  getBusinessUrlChangeState,
  buildBusinessUrlHistoryEntry,
};