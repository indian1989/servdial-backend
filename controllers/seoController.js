import City from "../models/City.js";
import Category from "../models/Category.js";
import Business from "../models/Business.js";

import {
  getCache,
  setCache,
} from "../utils/memoryCache.js";

import {
  rankBusinesses,
} from "../services/ranking/unifiedRankingEngine.js";

import {
  normalizeLocation,
} from "../utils/locationHelper.js";

const baseUrl = "https://servdial.com";



/*
=================================================
 GENERATE ALL CITY CATEGORY SEO URLS
=================================================
*/

export const generateCityCategoryPages = async (req,res)=>{

try{


const cities =
await City.find({
 status:"active"
})
.select(
 "slug name district state"
)
.lean();



const categories =
await Category.find({
 status:"active"
})
.select(
 "slug name parentCategory"
)
.lean();



// leaf + parent both supported

const pages=[];

for(const city of cities){

const locationText = normalizeLocation(
  city.name,
  city.district,
  city.state
);


for(const category of categories){


pages.push({

citySlug:
city.slug,


categorySlug:
category.slug,


url:
`${baseUrl}/${city.slug}/${category.slug}`,


title:
`${category.name} in ${locationText} | ServDial`,


description:
`Find verified ${category.name} services in ${locationText}. Compare ratings, reviews, contact details and trusted businesses on ServDial.`,

});


}


}



return res.json({

success:true,

data:pages,

meta:{
 total:pages.length
}

});



}
catch(error){


console.error(
"SEO PAGE GENERATION ERROR:",
error
);


return res.status(500).json({

success:false,

message:
"Error generating SEO pages"

});


}

};





/*
=================================================
 CITY + CATEGORY SEO PAGE
=================================================
*/


export const getCityCategoryPage = async(req,res)=>{

console.log(
  "🔥 SEO CITY CATEGORY API HIT",
  req.params
);

try{


const {
citySlug,
categorySlug
}=req.params;




/*
==============================
 CITY
==============================
*/


let city =
getCache(
`city:slug:${citySlug}`
);



if(!city){


city =
await City.findOne({

status:"active",

$or:[
{
slug:citySlug
},
{
"slugHistory.slug":citySlug
}

]

})
.lean();


if(!city){

return res.status(404).json({

success:false,

message:
"City not found"

});

}



setCache(

`city:slug:${citySlug}`,

city,

60*60*6

);


}





/*
==============================
 CATEGORY
==============================
*/


let category = null;

// Skip category lookup for /all page
if (categorySlug !== "all") {
  category = getCache(`category:slug:${categorySlug}`); if (!category) { category = await Category.findOne({ status: "active", $or: [ { slug: categorySlug }, { "slugHistory.slug": categorySlug } ] }).lean(); if (!category) { return res.status(404).json({ success: false, message: "Category not found" }); } setCache(`category:slug:${categorySlug}`, category, 60 * 60 * 6); } }



/*
==============================
 CITY ALL BUSINESSES PAGE
==============================
*/

if(categorySlug === "all") {

/*
==============================
 NORMAL CITY CATEGORY PAGE
==============================
*/


const businesses = await Business.find({

  status:"approved",

  $or: [
    { cityId: city._id },
    { citySlug: city.slug },
    { cityName: city.name.toLowerCase() }

  ]

})

.select(
`
_id
name
slug
description
logo
images
phone
whatsapp
website
address

cityId
citySlug
cityName

categoryId
categorySlug
categoryName

district
state
country
pincode

averageRating
totalReviews

location
businessHours

views
clicks
`
)

.populate(
"categoryId",
"name slug"
)

.lean();



const ranked =
rankBusinesses(
businesses,
{
userLocation:null,
userPreferences:null,
searchIntent:null,
timeOfDay:new Date().getHours()
}
);



const locationText =
normalizeLocation(
city.name,
city.district,
city.state,
city.country
);



return res.json({

success:true,


data:ranked,


city:{

name:city.name,

slug:city.slug,

district:city.district,

state:city.state,

country:city.country
},


category:null,

subCategories:[],

seo:{


title:
`Businesses in ${locationText} | ServDial`,


description:
`Find trusted local businesses in ${locationText} on ServDial.`,


canonical:
`${baseUrl}/${city.slug}/all`


},

faq:[

{

question:
`What businesses are available in ${locationText}?`,

answer:
`ServDial helps you find verified businesses in ${locationText} with ratings, reviews and contact details.`

}

],

meta:{


total:ranked.length,

page:1,

limit:ranked.length,

hasMore:false

}

});

}




// ================= PARENT + LEAF CATEGORY SUPPORT =================
let businesses = []; let subCategories = []; if (category.parentCategory) {
  
  // LEAF CATEGORY → direct businesses
  businesses = await Business.find({ cityId: city._id, categoryId: category._id, status: "approved" }) .populate("categoryId", "name slug") .lean(); } else {
    
  // PARENT CATEGORY → fetch children
  subCategories = await Category.find({ parentCategory: category._id, status: "active" }) .select("name slug") .lean(); const childIds = subCategories.map((c) => c._id);
  
  // Fetch businesses from all child categories
  businesses = await Business.find({ cityId: city._id, categoryId: { $in: childIds }, status: "approved" }) .populate("categoryId", "name slug") .lean(); }


const ranked = rankBusinesses(

businesses,

{

userLocation:null,

userPreferences:null,
searchIntent:null,

timeOfDay:new Date().getHours()

}

);



const locationText = normalizeLocation(

city.name,
city.district,

city.state,
city.country
);



return res.json({

success:true,


data:ranked,


city:{

name:city.name,
slug:city.slug,

district:city.district,

state:city.state,
country:city.country
},


category:{

name:category.name,

slug:category.slug
},


subCategories,


seo:{


title:
`${category.name} in ${locationText} | ServDial`,


description:
`Find verified ${category.name} businesses in ${locationText}. Compare ratings, reviews, contact details and trusted services on ServDial.`,


canonical:
`${baseUrl}/${city.slug}/${category.slug}`

},


faq:[


{
question:
`What are the best ${category.name} services in ${locationText}?`,

answer:
`ServDial helps you find verified ${category.name} businesses in ${locationText} with contact details, ratings and reviews.`
},


{
question:
`How can I contact a ${category.name} in ${locationText}?`,

answer:
`You can contact listed businesses directly through phone or WhatsApp from their ServDial profile.`
}


],

meta:{

total:ranked.length,

hasMore:false

}


});



}


catch(error){


console.error(
"SEO CONTROLLER ERROR:",
error
);



return res.status(500).json({

success:false,

message:
"Server error"

});

}

};