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
 Remove accents:
 Bihār -> Bihar
=================================================
*/

const normalizeText = (value = "") => {

  return value
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
  pincode,
}) => {


  try {


    if (!API_KEY) {

      console.log(
        "❌ OPENCAGE KEY MISSING"
      );

      return null;

    }



    const query = `
      ${address || ""},
      ${city || ""},
      ${state || ""},
      ${pincode || ""},
      India
    `;



    console.log(
      "🔥 GEOCODE QUERY:",
      query.trim()
    );



    const response = await axios.get(
      "https://api.opencagedata.com/geocode/v1/json",
      {
        params: {

          q: query,

          key: API_KEY,

          language: "en",

          countrycode: "in",

          limit: 1,

          no_annotations: 1,

        }
      }
    );



    const result =
      response.data?.results?.[0];



    if (!result) {


      console.log(
        "❌ NO GEOCODE RESULT"
      );


      return null;

    }




    const components =
      result.components || {};



    console.log(
      "✅ GEOCODE SUCCESS:",
      components
    );





    /*
    =================================
       COUNTRY CHECK
    =================================
    */


    if (
      components.country_code !== "in"
    ) {


      console.log(
        "❌ INVALID COUNTRY:",
        components.country
      );


      return null;

    }





    /*
    =================================
       STATE CHECK
    =================================
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
        normalizeText(
          state
        );



      if (

        !foundState.includes(expectedState) &&

        !expectedState.includes(foundState)

      ) {


        console.log(
          "❌ STATE MISMATCH:",
          {
            found:
              components.state,

            expected:
              state
          }
        );


        return null;

      }

    }





    /*
    =================================
       CITY CHECK
    =================================
    */


    const foundCity =
      normalizeText(
        components.city ||
        components.town ||
        components.village ||
        ""
      );


    const expectedCity =
      normalizeText(
        city
      );



    if (
      expectedCity &&
      foundCity
    ) {


      if (

        !foundCity.includes(expectedCity) &&

        !expectedCity.includes(foundCity)

      ) {


        console.log(
          "❌ CITY MISMATCH:",
          {
            found:
              components.city ||
              components.town,

            expected:
              city
          }
        );


        return null;

      }

    }

/*
===============================
 PINCODE VALIDATION
===============================
*/

if(
  pincode &&
  components.postcode
){

 const foundPin =
   String(components.postcode)
   .replace(/\D/g,"");


 const inputPin =
   String(pincode)
   .replace(/\D/g,"");


 if(
   foundPin !== inputPin
 ){

   console.log(
    "❌ PINCODE MISMATCH:",
    {
      found:foundPin,
      expected:inputPin
    }
   );


   return null;

 }

}



    /*
    =================================
       FINAL GEOJSON LOCATION
    =================================
    */


    const latitude =
      result.geometry.lat;


    const longitude =
      result.geometry.lng;



    if(
      !latitude ||
      !longitude
    ){

      console.log(
        "❌ INVALID COORDINATES"
      );

      return null;

    }



    return {


      latitude,


      longitude,


      location: {

        type: "Point",

        coordinates: [

          longitude,

          latitude

        ]

      }


    };




  } catch(error) {


    console.error(
      "❌ GEOCODING FAILED:",
      error.response?.data ||
      error.message
    );


    return null;


  }


};