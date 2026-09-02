import City from "../models/City.js";
import Category from "../models/Category.js";
import Business from "../models/Business.js";

import {
  getCache,
  setCache,
} from "../utils/memoryCache.js";

import { rankBusinesses } from "../utils/rankBusinesses.js";

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

export const getCityCategoryPage = async (req, res) => {
  console.log(
    "🔥 SEO CITY CATEGORY API HIT",
    req.params
  );

  try {
    const {
      citySlug,
      categorySlug,
    } = req.params;

    /* =====================================================
       NORMALIZE SLUGS
    ===================================================== */

    const requestedCitySlug =
      citySlug?.toLowerCase().trim();

    const requestedCategorySlug =
      categorySlug?.toLowerCase().trim();

    if (!requestedCitySlug || !requestedCategorySlug) {
      return res.status(400).json({
        success: false,
        message: "City slug and category slug are required",
      });
    }

    /* =====================================================
       CITY
    ===================================================== */

    let city = getCache(
      `city:slug:${requestedCitySlug}`
    );

    if (!city) {
      city = await City.findOne({
        status: "active",

        $or: [
          {
            slug: requestedCitySlug,
          },
          {
            "slugHistory.slug": requestedCitySlug,
          },
        ],
      }).lean();

      if (!city) {
        return res.status(404).json({
          success: false,
          message: "City not found",
        });
      }

      setCache(
        `city:slug:${requestedCitySlug}`,
        city,
        60 * 60 * 6
      );
    }

    /* =====================================================
       CITY CANONICAL SLUG
       
       If city itself was renamed, determine current slug.
    ===================================================== */

    const cityIsOldSlug =
      city.slug !== requestedCitySlug &&
      Array.isArray(city.slugHistory) &&
      city.slugHistory.some(
        (history) =>
          history.slug === requestedCitySlug
      );

    const canonicalCitySlug =
      city.slug;


    /* =====================================================
       ALL BUSINESSES
       
       /city/all
    ===================================================== */

    if (requestedCategorySlug === "all") {
      const businesses = await Business.find({
        status: "approved",

        $or: [
          {
            cityId: city._id,
          },
          {
            citySlug: city.slug,
          },
          {
            cityName: city.name.toLowerCase(),
          },
        ],
      })
        .select(`
          _id
          name
          slug
          description
          logo
          images
          phone
          landline
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
        `)
        .populate(
          "categoryId",
          "name slug"
        )
        .lean();

        console.log(
  "📞 SEO BEFORE RANK CALL DEBUG:",
  {
    phone: businesses?.[0]?.phone,
    landline: businesses?.[0]?.landline,
    id: businesses?.[0]?._id,
    name: businesses?.[0]?.name,
  }
);

      const ranked = rankBusinesses(
        businesses,
        {
          userLocation: null,
          userPreferences: null,
          searchIntent: null,
          timeOfDay: new Date().getHours(),
        }
      );

      console.log(
  "📞 SEO AFTER RANK CALL DEBUG:",
  {
    phone: ranked?.[0]?.phone,
    landline: ranked?.[0]?.landline,
    id: ranked?.[0]?._id,
    name: ranked?.[0]?.name,
  }
);

      const locationText =
        normalizeLocation(
          city.name,
          city.district,
          city.state,
          city.country
        );

      /*
      =====================================================
      CITY OLD SLUG REDIRECT FOR /all
      =====================================================
      */

      if (cityIsOldSlug) {
        return res.json({
          success: true,

          redirect: true,
          permanent: true,

          oldCitySlug: requestedCitySlug,
          canonicalCitySlug,

          redirectUrl:
            `${baseUrl}/${canonicalCitySlug}/all`,

          data: ranked,

          city: {
            name: city.name,
            slug: city.slug,
            district: city.district,
            state: city.state,
            country: city.country,
          },

          category: null,
          subCategories: [],

          seo: {
            title:
              `Businesses in ${locationText} | ServDial`,

            description:
              `Find trusted local businesses in ${locationText} on ServDial.`,

            canonical:
              `${baseUrl}/${canonicalCitySlug}/all`,
          },

          faq: [
            {
              question:
                `What businesses are available in ${locationText}?`,

              answer:
                `ServDial helps you find verified businesses in ${locationText} with ratings, reviews and contact details.`,
            },
          ],

          meta: {
            total: ranked.length,
            page: 1,
            limit: ranked.length,
            hasMore: false,
          },
        });
      }

      return res.json({
        success: true,

        redirect: false,

        data: ranked,

        city: {
          name: city.name,
          slug: city.slug,
          district: city.district,
          state: city.state,
          country: city.country,
        },

        category: null,
        subCategories: [],

        seo: {
          title:
            `Businesses in ${locationText} | ServDial`,

          description:
            `Find trusted local businesses in ${locationText} on ServDial.`,

          canonical:
            `${baseUrl}/${canonicalCitySlug}/all`,
        },

        faq: [
          {
            question:
              `What businesses are available in ${locationText}?`,

            answer:
              `ServDial helps you find verified businesses in ${locationText} with ratings, reviews and contact details.`,
          },
        ],

        meta: {
          total: ranked.length,
          page: 1,
          limit: ranked.length,
          hasMore: false,
        },
      });
    }


    /* =====================================================
       CATEGORY
       
       IMPORTANT:
       Current slug OR slugHistory.
       
       No hardcoded category list.
    ===================================================== */

    let category = null;

    /*
    -----------------------------------------------------
    First try CURRENT slug
    -----------------------------------------------------
    */

    const currentCategoryCacheKey =
      `category:current:${requestedCategorySlug}`;

    category = getCache(
      currentCategoryCacheKey
    );

    if (!category) {
      category = await Category.findOne({
        status: "active",
        slug: requestedCategorySlug,
      }).lean();

      if (category) {
        setCache(
          currentCategoryCacheKey,
          category,
          60 * 60 * 6
        );
      }
    }


    /*
    -----------------------------------------------------
    If current slug not found,
    search slugHistory
    -----------------------------------------------------
    */

    let isOldCategorySlug = false;

    if (!category) {
      const oldCategoryCacheKey =
        `category:history:${requestedCategorySlug}`;

      category = getCache(
        oldCategoryCacheKey
      );

      if (!category) {
        category = await Category.findOne({
          status: "active",

          "slugHistory.slug":
            requestedCategorySlug,
        }).lean();

        if (category) {
          setCache(
            oldCategoryCacheKey,
            category,
            60 * 60 * 6
          );
        }
      }

      if (category) {
        isOldCategorySlug = true;
      }
    }


    /* =====================================================
       CATEGORY NOT FOUND
    ===================================================== */

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }


    /* =====================================================
       SAFETY CHECK
       
       This guarantees that the requested old slug
       really exists in slugHistory.
    ===================================================== */

    if (
      !isOldCategorySlug &&
      category.slug !== requestedCategorySlug
    ) {
      isOldCategorySlug =
        Array.isArray(category.slugHistory) &&
        category.slugHistory.some(
          (history) =>
            history.slug === requestedCategorySlug
        );
    }


    /* =====================================================
       OLD CATEGORY SLUG
       
       Example:
       
       /hajipur-vaishali-bihar/tour-operators

                     ↓

       /hajipur-vaishali-bihar/tour-operator
    ===================================================== */

    if (isOldCategorySlug) {
      return res.json({
        success: true,

        redirect: true,
        permanent: true,

        oldSlug:
          requestedCategorySlug,

        canonicalSlug:
          category.slug,

        redirectUrl:
          `${baseUrl}/${canonicalCitySlug}/${category.slug}`,

        city: {
          name: city.name,
          slug: city.slug,
          district: city.district,
          state: city.state,
          country: city.country,
        },

        category: {
          name: category.name,
          slug: category.slug,
        },

        subCategories: [],

        data: [],

        seo: {
          title:
            `${category.name} in ${normalizeLocation(
              city.name,
              city.district,
              city.state,
              city.country
            )} | ServDial`,

          description:
            `Find verified ${category.name} services in ${normalizeLocation(
              city.name,
              city.district,
              city.state,
              city.country
            )}.`,

          canonical:
            `${baseUrl}/${canonicalCitySlug}/${category.slug}`,
        },

        meta: {
          total: 0,
          hasMore: false,
        },
      });
    }


    /* =====================================================
       CATEGORY IS CURRENT
       
       Continue normally.
    ===================================================== */

    let businesses = [];
    let subCategories = [];


    /* =====================================================
       PARENT CATEGORY
       OR
       LEAF CATEGORY
    ===================================================== */

    if (category.parentCategory) {

      /*
      =====================================================
      LEAF CATEGORY
      =====================================================
      */

      businesses =
        await Business.find({
          cityId: city._id,
          categoryId: category._id,
          status: "approved",
        })
          .populate(
            "categoryId",
            "name slug"
          )
          .lean();

    } else {

      /*
      =====================================================
      PARENT CATEGORY
      =====================================================
      */

      subCategories =
        await Category.find({
          parentCategory:
            category._id,

          status: "active",
        })
          .select(
            "name slug icon image"
          )
          .sort({
            order: 1,
            name: 1,
          })
          .lean();

      const childIds =
        subCategories.map(
          (c) => c._id
        );


      /*
      =====================================================
      BUSINESSES FROM ALL CHILD CATEGORIES
      =====================================================
      */

      if (childIds.length > 0) {
        businesses =
          await Business.find({
            cityId: city._id,

            categoryId: {
              $in: childIds,
            },

            status: "approved",
          })
            .populate(
              "categoryId",
              "name slug"
            )
            .lean();
      }
    }


    /* =====================================================
       RANK BUSINESSES
    ===================================================== */

    console.log(
  "📞 CATEGORY BEFORE RANK CALL DEBUG:",
  businesses?.map((b) => ({
    id: b?._id,
    name: b?.name,
    phone: b?.phone,
    landline: b?.landline,
  }))
);

const ranked =
  rankBusinesses(
    businesses,
    {
      userLocation: null,
      userPreferences: null,
      searchIntent: null,
      timeOfDay:
        new Date().getHours(),
    }
  );

console.log(
  "📞 CATEGORY AFTER RANK CALL DEBUG:",
  ranked?.map((b) => ({
    id: b?._id,
    name: b?.name,
    phone: b?.phone,
    landline: b?.landline,
  }))
);

    /* =====================================================
       LOCATION
    ===================================================== */

    const locationText =
      normalizeLocation(
        city.name,
        city.district,
        city.state,
        city.country
      );


    /* =====================================================
       FINAL RESPONSE
    ===================================================== */

    return res.json({
      success: true,

      redirect: cityIsOldSlug,

      permanent: cityIsOldSlug,

      oldCitySlug:
        cityIsOldSlug
          ? requestedCitySlug
          : null,

      canonicalCitySlug:
        canonicalCitySlug,

      data: ranked,

      city: {
        name: city.name,
        slug: city.slug,
        district: city.district,
        state: city.state,
        country: city.country,
      },

      category: {
        name: category.name,
        slug: category.slug,
      },

      subCategories,

      seo: {
        title:
          `${category.name} in ${locationText} | ServDial`,

        description:
          `Find verified ${category.name} businesses in ${locationText}. Compare ratings, reviews, contact details and trusted services on ServDial.`,

        canonical:
          `${baseUrl}/${canonicalCitySlug}/${category.slug}`,
      },

      faq: [
        {
          question:
            `What are the best ${category.name} services in ${locationText}?`,

          answer:
            `ServDial helps you find verified ${category.name} businesses in ${locationText} with contact details, ratings and reviews.`,
        },

        {
          question:
            `How can I contact a ${category.name} in ${locationText}?`,

          answer:
            `You can contact listed businesses directly through phone or WhatsApp from their ServDial profile.`,
        },
      ],

      meta: {
        total: ranked.length,
        hasMore: false,
      },
    });

  } catch (error) {

    console.error(
      "SEO CONTROLLER ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};