import express from "express";
import { geocodeAddress } from "../services/geocodeService.js";

const router = express.Router();


router.post("/", async(req,res)=>{

    console.log("🔥 GEOCODE POST HIT");
  console.log("📍 BODY:", req.body);
  
  try {

    const result = await geocodeAddress(req.body);


    if(!result){

      return res.status(404).json({
        success:false,
        message:"Location not found"
      });

    }


    res.json({
      success:true,
      ...result
    });


  } catch(error){

    console.error(
      "GEOCODE ROUTE ERROR:",
      error
    );


    res.status(500).json({
      success:false,
      message:"Geocode failed"
    });

  }

});


export default router;