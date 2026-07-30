import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// ================= LOAD ENV =================

dotenv.config({
  path: path.resolve(__dirname, "../.env"),
});


console.log(
  "🔥 ENV FILE:",
  path.resolve(__dirname, "../.env")
);


console.log(
  "🔥 OPENCAGE KEY STATUS:",
  process.env.OPENCAGE_API_KEY
    ? "FOUND"
    : "MISSING"
);


console.log(
  "🔥 KEY LENGTH:",
  process.env.OPENCAGE_API_KEY?.length
);


// ================= IMPORTS =================

const mongoose = (await import("mongoose")).default;

const Business =
  (await import("../models/Business.js")).default;

const { geocodeAddress } =
  await import("../services/geocodeService.js");



// ================= UPDATE LOCATIONS =================

const updateBusinessLocations = async () => {

  try {


    await mongoose.connect(
      process.env.MONGO_URI
    );


    console.log(
      "✅ MongoDB Connected"
    );



   const businesses =
 await Business.find({
   $or:[
     {
       location:{
        $exists:false
       }
     },
     {
       "location.coordinates":{
          $size:0
       }
     }
   ]
 });



    console.log(
      "🔥 TOTAL BUSINESSES:",
      businesses.length
    );



    let updated = 0;



    for (const business of businesses) {


      console.log(
        "\n===================="
      );


      console.log(
        "Updating:",
        business.name
      );



      try {


        const addressLocation =
          await geocodeAddress({

            address:
              business.address || "",

            city:
              business.cityName || "",

            district:
              business.district || "",

            state:
              business.state || "",

            pincode:
              business.pincode || "",

          });



        if(addressLocation?.location){


          business.location =
            addressLocation.location;



          await business.save();



          updated++;



          console.log(
            "✅ UPDATED:",
            business.location
          );


        } else {


          console.log(
            "❌ LOCATION NOT FOUND"
          );


        }



        // OpenCage rate limit protection
        await new Promise(
          resolve =>
            setTimeout(resolve,1500)
        );



      } catch(err){


        console.log(
          "❌ GEOCODE ERROR:",
          business.name,
          err.message
        );


      }


    }



    console.log(
      "\n🎉 UPDATE COMPLETE"
    );


    console.log(
      "🔥 TOTAL UPDATED:",
      updated
    );



    process.exit(0);



  } catch(err){


    console.error(
      "❌ SCRIPT FAILED:",
      err.message
    );


    process.exit(1);

  }

};



updateBusinessLocations();