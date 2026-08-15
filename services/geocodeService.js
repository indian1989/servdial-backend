// backend/services/geocodeService.js

import axios from "axios";

const API_KEY = process.env.OPENCAGE_API_KEY;

console.log(
  "🔥 OPENCAGE KEY STATUS:",
  API_KEY ? "FOUND" : "MISSING"
);

console.log(
  "🔥 KEY LENGTH:",
  API_KEY?.length
);

/*
=================================================
 NORMALIZE TEXT
=================================================
*/

const normalizeText = (value = "") => {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .trim();
};

/*
=================================================
 BUSINESS ADDRESS GEOCODE
=================================================
*/

export const geocodeAddress = async ({
  address,
  city,
  district,
  state,
  country,
  pincode,
}) => {
  try {
    if (!API_KEY) {
      console.log("❌ OPENCAGE KEY MISSING");
      return null;
    }

    /*
    ===============================================
    ADDRESS OBJECT -> STRING
    ===============================================
    */

    const street =
      typeof address === "object"
        ? address?.street || ""
        : String(address || "");

    const area =
      typeof address === "object"
        ? address?.area || ""
        : "";

    const landmark =
      typeof address === "object"
        ? address?.landmark || ""
        : "";

    /*
    ===============================================
    BUILD DETAILED QUERY
    ===============================================
    */

    const queryParts = [
      street,
      area,
      landmark,
      city,
      district,
      state,
      pincode,
      country || "India",
    ].filter(Boolean);

    const query = queryParts.join(", ");

    console.log(
      "🔥 GEOCODE QUERY:",
      query
    );

    /*
    ===============================================
    OPENCAGE REQUEST
    ===============================================
    */

    const response = await axios.get(
      "https://api.opencagedata.com/geocode/v1/json",
      {
        params: {
          q: query,

          key: API_KEY,

          language: "en",

          countrycode: "in",

          limit: 5,

          no_annotations: 1,
        },
      }
    );

    const results =
      response.data?.results || [];

    if (!results.length) {
      console.log(
        "❌ NO GEOCODE RESULT"
      );

      return null;
    }

    /*
    ===============================================
    FIND BEST VALID RESULT
    ===============================================
    */

    let validResult = null;

    for (const result of results) {
      const components =
        result.components || {};

      /*
      -----------------------------------------------
      COUNTRY CHECK
      -----------------------------------------------
      */

      if (
        components.country_code &&
        components.country_code !== "in"
      ) {
        continue;
      }

      /*
      -----------------------------------------------
      STATE CHECK
      -----------------------------------------------
      */

      if (
        state &&
        components.state
      ) {
        const foundState =
          normalizeText(
            components.state
          );

        const expectedState =
          normalizeText(state);

        if (
          !foundState.includes(expectedState) &&
          !expectedState.includes(foundState)
        ) {
          continue;
        }
      }

      /*
      -----------------------------------------------
      CITY CHECK
      -----------------------------------------------
      */

      const foundCity =
        normalizeText(
          components.city ||
          components.town ||
          components.village ||
          components.municipality ||
          ""
        );

      const expectedCity =
        normalizeText(city);

      if (
        expectedCity &&
        foundCity &&
        !foundCity.includes(expectedCity) &&
        !expectedCity.includes(foundCity)
      ) {
        continue;
      }

      /*
      -----------------------------------------------
      PINCODE CHECK
      -----------------------------------------------
      */

      if (
        pincode &&
        components.postcode
      ) {
        const foundPin =
          String(
            components.postcode
          ).replace(/\D/g, "");

        const inputPin =
          String(pincode)
            .replace(/\D/g, "");

        if (
          foundPin &&
          inputPin &&
          foundPin !== inputPin
        ) {
          console.log(
            "❌ PINCODE MISMATCH:",
            {
              found: foundPin,
              expected: inputPin,
            }
          );

          continue;
        }
      }

      validResult = result;

      break;
    }

    /*
    ===============================================
    NO VALID RESULT
    ===============================================
    */

    if (!validResult) {
      console.log(
        "❌ NO VALID LOCATION RESULT"
      );

      return null;
    }

    const components =
      validResult.components || {};

    console.log(
      "✅ GEOCODE SUCCESS:",
      components
    );

    /*
    ===============================================
    COORDINATES
    ===============================================
    */

    const latitude =
      Number(
        validResult.geometry?.lat
      );

    const longitude =
      Number(
        validResult.geometry?.lng
      );

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude)
    ) {
      console.log(
        "❌ INVALID COORDINATES"
      );

      return null;
    }

    /*
    ===============================================
    FINAL RESULT
    ===============================================
    */

    const location = {
      type: "Point",

      coordinates: [
        longitude,
        latitude,
      ],
    };

    console.log(
      "📍 FINAL BUSINESS GEO:",
      location.coordinates
    );

    return {
      latitude,
      longitude,
      location,
    };

  } catch (error) {
    console.error(
      "❌ GEOCODING FAILED:",
      error.response?.data ||
      error.message
    );

    return null;
  }
};