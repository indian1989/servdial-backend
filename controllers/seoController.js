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


const baseUrl = "https://servdial.com";



const titleCase = (text = "") =>
  text
    .toString()
    .trim()
    .replace(/\b\w/g, c => c.toUpperCase());



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


for(const category of categories){


pages.push({

citySlug:
city.slug,


categorySlug:
category.slug,


url:
`${baseUrl}/${city.slug}/${category.slug}`,


title:
`${category.name} in ${city.name}, ${city.district || ""} | ServDial`,


description:
`Find verified ${category.name} services in ${city.name}, ${city.state || ""}. Compare ratings, reviews, contact details and trusted businesses on ServDial.`


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



if(!category){


category =
await Category.findOne({

status:"active",

$or:[

{
slug:categorySlug
},

{
"slugHistory.slug":categorySlug
}

]

})

.lean();



if(!category){

return res.status(404).json({

success:false,

message:
"Category not found"

});

}



setCache(

`category:slug:${categorySlug}`,

category,

60*60*6

);



}




/*
==============================
 CATEGORY TREE SUPPORT
==============================
*/


let categoryIds = [];
let subCategories = [];

// MAIN CATEGORY
if (!category.parentCategory) {

  subCategories = await Category.find({
    parentCategory: category._id,
    status:"active"
  })
  .select("name slug")
  .lean();


  categoryIds = [
    category._id,
    ...subCategories.map(
      c=>c._id
    )
  ];

}
else {

  categoryIds=[
    category._id
  ];

}

const page =
Number(req.query.page) || 1;

const limit =
Number(req.query.limit) || 20;

const skip =
(page - 1) * limit;

/*
==============================
 BUSINESSES
==============================
*/

console.log(
  "CITY ID:",
  city._id
);

console.log(
  "CATEGORY IDS:",
  categoryIds
);

console.log(
  "CATEGORY:",
  category.name
);

const businesses =

await Business.find({

cityId:
city._id,


categoryId:
{
$in:
categoryIds
},


status:
"approved"


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

.populate("categoryId", "name slug")

.lean();

console.log(
  "FOUND BUSINESSES:",
  businesses.length
);




/*
==============================
 RANKING
==============================
*/


const ranked =

rankBusinesses(

businesses,

{

userLocation:null,

userPreferences:null,

searchIntent:null,

timeOfDay:
new Date().getHours()

}

);





/*
==============================
 SEO DATA
==============================
*/


const locationText =

[
city.name,
city.district,
city.state

]
.filter(Boolean)
.join(", ");




const seo={


title:

`${category.name} in ${locationText} | Best Verified Services - ServDial`,



description:

`Find verified ${category.name} services in ${locationText}. View ratings, reviews, contact numbers, photos and trusted businesses on ServDial.`,



canonical:

`${baseUrl}/${city.slug}/${category.slug}`


};






return res.json({


success:true,


data:ranked,


subCategories,

seo,

city:{

name:city.name,
slug:city.slug,
district:city.district,
state:city.state

},


category:{

name:category.name,
slug:category.slug,
isParent:
!category.parentCategory

},



meta:{

total: ranked.length,

page,

limit,

hasMore:
ranked.length === limit

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