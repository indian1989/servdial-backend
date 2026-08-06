// backend/server.js

import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const app = express();


// =================================================
// BASIC CONFIG
// =================================================

app.set("etag", false);



// =================================================
// GLOBAL MIDDLEWARE
// =================================================


app.use(
  cors({

    origin: [
      process.env.FRONTEND_URL,
      "http://localhost:5173",
    ],

    credentials: true,

  })
);



app.use(
  express.json({
    limit: "5mb",
  })
);



// =================================================
// CACHE CONTROL
// =================================================


app.use((req,res,next)=>{


  // Sitemap Google cache allow

  if(
    req.path.includes("sitemap")
  ){
    return next();
  }



  res.setHeader(
    "Cache-Control",
    "no-store, no-cache, must-revalidate"
  );


  res.setHeader(
    "Pragma",
    "no-cache"
  );


  res.setHeader(
    "Expires",
    "0"
  );


  res.removeHeader(
    "ETag"
  );


  next();


});



// =================================================
// ROUTES IMPORT
// =================================================


// AUTH

import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";


// BUSINESS

import publicBusinessRoutes from "./routes/publicBusinessRoutes.js";
import adminBusinessRoutes from "./routes/adminBusinessRoutes.js";


// CATEGORY

import categoryRoutes from "./routes/categoryRoutes.js";
import adminCategoryRoutes from "./routes/adminCategoryRoutes.js";


// CITY

import cityRoutes from "./routes/cityRoutes.js";
import adminCityRoutes from "./routes/adminCityRoutes.js";


// ADMIN

import adminRoutes from "./routes/adminRoutes.js";


// FEATURES

import homepageRoutes from "./routes/homepageRoutes.js";
import searchRoutes from "./routes/searchRoutes.js";
import leadRoutes from "./routes/leadRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";
import recommendationRoutes from "./routes/recommendationRoutes.js";
import providerRoutes from "./routes/providerRoutes.js";


// SEO + SYSTEM

import seoRoutes from "./routes/seoRoutes.js";
import sitemapRoutes from "./routes/sitemapRoutes.js";
import locationRoutes from "./routes/locationRoutes.js";
import healthRoutes from "./routes/health.js";


// ADS

import bannerRoutes from "./routes/bannerRoutes.js";
import adminBannerRoutes from "./routes/adminBannerRoutes.js";
import geocodeRoutes from "./routes/geocodeRoutes.js";




// =================================================
// ROOT API
// =================================================


app.get(
  "/api",
  (req,res)=>{

    res.json({

      success:true,

      message:
      "🚀 ServDial API Running"

    });

  }
);





// =================================================
// API ROUTES
// =================================================



// AUTH

app.use(
  "/api/auth",
  authRoutes
);


app.use(
  "/api/user",
  userRoutes
);





// SEO

app.use(
  "/api/seo",
  seoRoutes
);





// BUSINESS

app.use(
  "/api/businesses",
  publicBusinessRoutes
);


app.use(
  "/api/admin/businesses",
  adminBusinessRoutes
);





// ADMIN

app.use(
  "/api/admin",
  adminRoutes
);





// CATEGORY

app.use(
  "/api/categories",
  categoryRoutes
);


app.use(
  "/api/admin/categories",
  adminCategoryRoutes
);





// CITY

app.use(
  "/api/cities",
  cityRoutes
);


app.use(
  "/api/admin/cities",
  adminCityRoutes
);





// BANNER

app.use(
  "/api/banners",
  bannerRoutes
);


app.use(
  "/api/admin/banners",
  adminBannerRoutes
);





// FEATURES


app.use(
  "/api/homepage",
  homepageRoutes
);


app.use(
  "/api/search",
  searchRoutes
);


app.use(
  "/api/leads",
  leadRoutes
);


app.use(
  "/api/reviews",
  reviewRoutes
);


app.use(
  "/api/recommendations",
  recommendationRoutes
);


app.use(
  "/api/provider",
  providerRoutes
);

// LOCATION SERVICES

app.use(
  "/api/location",
  locationRoutes
);


app.use(
  "/api/geocode",
  geocodeRoutes
);


// =================================================
// INFRA ROUTES
// =================================================


// IMPORTANT:
// sitemap.xml
// sitemap-cities.xml
// sitemap-businesses.xml

app.use(
  "/",
  sitemapRoutes
);



app.use(
  "/api/health",
  healthRoutes
);





// =================================================
// DATABASE
// =================================================


const connectDB = async()=>{


try{


if(
!process.env.MONGO_URI
){

throw new Error(
"MONGO_URI missing"
);

}



const conn =
await mongoose.connect(

process.env.MONGO_URI,

{

serverSelectionTimeoutMS:10000,

maxPoolSize:20,

}

);



console.log(
"✅ MongoDB Connected:",
conn.connection.host
);



}

catch(error){


console.error(
"❌ MongoDB Connection Failed:",
error.message
);


process.exit(1);


}


};






// =================================================
// 404 HANDLER
// =================================================


app.use(
(req,res)=>{


res.status(404).json({

success:false,

message:
"Route not found"

});


});





// =================================================
// GLOBAL ERROR HANDLER
// =================================================


app.use(
(err,req,res,next)=>{


console.error(
"❌ Server Error:",
err
);



res.status(
err.status || 500
)
.json({

success:false,

message:
err.message ||
"Internal Server Error"

});


}

);





// =================================================
// START SERVER
// =================================================


const PORT =
process.env.PORT || 5000;



const startServer = async()=>{


await connectDB();



const server =
app.listen(
PORT,
()=>{


console.log(
`🔥 ServDial Server running on ${PORT}`
);


}

);



// graceful shutdown

process.on(
"SIGTERM",
()=>{


console.log(
"SIGTERM received"
);


server.close(
()=>{

mongoose.connection.close();

process.exit(0);

}
);


});


};



startServer();