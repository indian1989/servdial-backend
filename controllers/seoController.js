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


let category =
getCache(
`category:slug:${categorySlug}`
);


/*
==============================
 CITY ALL BUSINESSES PAGE
==============================
*/

if(categorySlug === "all") {


const page =
Number(req.query.page) || 1;

const limit =
Number(req.query.limit) || 20;

const businesses = await Business.find({

cityId: city._id,

status:"approved"

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


const locationText = normalizeLocation(
  city.name,
  city.district,
  city.state
);


return res.json({

success:true,

data:ranked,


subCategories:[],


seo:{


title:
`Businesses in ${locationText} | ServDial`,


description:
`Find trusted local businesses in ${locationText}. Explore restaurants, hotels, electricians, plumbers, salons and more on ServDial.`,


canonical:
`${baseUrl}/${city.slug}/all`

},


city:{


name:city.name,
slug:city.slug,
district:city.district,
state:city.state

},


category:null,


meta:{


total:ranked.length,

page,

limit,

hasMore:
ranked.length===limit

}


});

}
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