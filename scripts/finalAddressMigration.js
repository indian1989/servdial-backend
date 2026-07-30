import mongoose from "mongoose";
import dotenv from "dotenv";
import Business from "../models/Business.js";

dotenv.config();


const clean = (text = "") =>
  text
    .toString()
    .trim()
    .replace(/\.+$/, "");



const migrateAddress = (business) => {


  let address = business.address;


  let street = "";
  let area = "";
  let landmark = "";



  /*
  ==============================
  CASE 1
  OLD STRING ADDRESS
  ==============================
  */

  if(typeof address === "string"){


    const parts =
      address
      .split(",")
      .map(clean)
      .filter(Boolean);


    street =
      parts[0] || "";


    area =
      parts[1] || "";


    landmark =
      parts
      .slice(2)
      .join(", ");

  }



  /*
  ==============================
  CASE 2
  OBJECT ADDRESS
  ==============================
  */


  else if(
    address &&
    typeof address === "object"
  ){


    const oldStreet =
      clean(address.street);



    const parts =
      oldStreet
      .split(",")
      .map(clean)
      .filter(Boolean);



    if(parts.length > 1){


      street =
        parts[0];


      area =
        address.area ||
        parts[1];


      landmark =
        parts
        .slice(2)
        .join(", ");


    }
    else {


      street =
        oldStreet;


      area =
        clean(address.area);


      landmark =
        clean(address.landmark);


    }


  }



  /*
  ==============================
  REMOVE CITY/DISTRICT/STATE
  FROM LANDMARK
  ==============================
  */


  const removeWords = [
    business.cityId?.name,
    business.cityName,
    business.district,
    business.state,
    business.country
  ]
  .filter(Boolean)
  .map(x =>
    clean(x).toLowerCase()
  );



  landmark =
    landmark
    .split(",")
    .map(clean)
    .filter(Boolean)
    .filter(
      item =>
        !removeWords.includes(
          item.toLowerCase()
        )
    )
    .join(", ");



  return {

    street,

    area,

    landmark

  };

};




const run = async()=>{


try{


await mongoose.connect(
  process.env.MONGO_URI
);


console.log(
 "MongoDB Connected"
);



const businesses =
 await Business.find({})
 



console.log(
 "Total businesses:",
 businesses.length
);



let updated = 0;



for(const business of businesses){



 const newAddress =
   migrateAddress(business);



 const old =
   JSON.stringify(
    business.address
   );



 const fresh =
   JSON.stringify(
    newAddress
   );



 if(old !== fresh){


   business.address =
     newAddress;


   await business.save();


   updated++;


   console.log(
    "Updated:",
    business.name,
    newAddress
   );


 }



}



console.log(
 "===================="
);


console.log(
 "Migration Completed:",
 updated
);


process.exit(0);



}catch(error){


console.error(error);


process.exit(1);


}


};



run();