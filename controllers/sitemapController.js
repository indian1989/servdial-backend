import Business from "../models/Business.js";
import City from "../models/City.js";
import Category from "../models/Category.js";
import { getCache, setCache } from "../utils/memoryCache.js";

/* ========================= CONFIG ========================= */

const FRONTEND_URL =
  process.env.FRONTEND_URL || "https://servdial.com";

const BACKEND_URL =
  process.env.BACKEND_URL || "https://api.servdial.com";

const PAGE_SIZE = 50000;

const getLastMod = (date) =>
  new Date(date || Date.now()).toISOString();

const xmlHeader = `<?xml version="1.0" encoding="UTF-8"?>`;

/* ========================= SITEMAP INDEX ========================= */

export const sitemapIndex = async (req, res) => {
  try {

    const cached = getCache("sitemap:index");

if (cached) {
  return res
    .type("application/xml")
    .send(cached);
}

   const businessCount = await Business.countDocuments({
  status: "approved",
  isDeleted: false,
});

const cityCount = await City.countDocuments({
  status: "active",
});

const categoryCount = await Category.countDocuments({
  status: "active",
});

const cityCategoryCount = await Business.aggregate([
  {
    $match: {
      status: "approved",
      isDeleted: false,
    },
  },
  {
    $group: {
      _id: {
        citySlug: "$citySlug",
        categorySlug: "$categorySlug",
      },
    },
  },
  {
    $count: "total",
  },
]);

const businessPages = Math.ceil(businessCount / PAGE_SIZE);
const cityPages = Math.ceil(cityCount / PAGE_SIZE);
const categoryPages = Math.ceil(categoryCount / PAGE_SIZE);

const cityCategoryPages = Math.ceil(
  (cityCategoryCount[0]?.total || 0) / PAGE_SIZE
);

const cityPageCount = cityCount;
const cityPageSitemapPages = Math.ceil(
  cityPageCount / PAGE_SIZE
);

    const businessMaps = Array.from(
      { length: businessPages },
      (_, i) => `
<sitemap>
<loc>${BACKEND_URL}/sitemap-businesses-${i + 1}.xml</loc>
<lastmod>${new Date().toISOString()}</lastmod>
</sitemap>`
    ).join("");

    const cityMaps = Array.from(
      { length: cityPages },
      (_, i) => `
<sitemap>
<loc>${BACKEND_URL}/sitemap-cities-${i + 1}.xml</loc>
<lastmod>${new Date().toISOString()}</lastmod>
</sitemap>`
    ).join("");

    const categoryMaps = Array.from(
      { length: categoryPages },
      (_, i) => `
<sitemap>
<loc>${BACKEND_URL}/sitemap-categories-${i + 1}.xml</loc>
<lastmod>${new Date().toISOString()}</lastmod>
</sitemap>`
    ).join("");

    const cityCategoryMaps = Array.from(
  { length: cityCategoryPages },
  (_, i) => `
<sitemap>
<loc>${BACKEND_URL}/sitemap-city-category-${i + 1}.xml</loc>
<lastmod>${new Date().toISOString()}</lastmod>
</sitemap>`
).join("");

const cityPageMaps = Array.from(
  { length: cityPageSitemapPages },
  (_, i) => `
<sitemap>
<loc>${BACKEND_URL}/sitemap-city-pages-${i + 1}.xml</loc>
<lastmod>${new Date().toISOString()}</lastmod>
</sitemap>`
).join("");

const sitemap = `
${xmlHeader}
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">

<sitemap>
<loc>${BACKEND_URL}/sitemap-static.xml</loc>
<lastmod>${new Date().toISOString()}</lastmod>
</sitemap>

${cityMaps}
${categoryMaps}
${businessMaps}
${cityCategoryMaps}
${cityPageMaps}

</sitemapindex>`;

    res.type("application/xml");

res.set(
  "Cache-Control",
  "public, max-age=3600, s-maxage=3600"
);

const finalSitemap = sitemap.trim();

setCache(
  "sitemap:index",
  finalSitemap,
  3600
);

res.send(finalSitemap);
  } catch (err) {
    res.status(500).send("Error generating sitemap index");
  }
};

/* ========================= STATIC ========================= */

export const staticSitemap = async (req, res) => {

  const cacheKey = "sitemap:static";

  const cached = getCache(cacheKey);

  if (cached) {
    return res
      .type("application/xml")
      .send(cached);
  }


  const pages = [
    "",
    "/about",
    "/contact",
    "/privacy-policy",
    "/terms",
    "/advertise",
    "/community-guidelines",
    "/disclaimer",
    "/provider-agreement",
    "/refund-policy",
    "/faq"
  ];

  const urls = pages
    .map(
      (page) => `
<url>
<loc>${FRONTEND_URL}${page}</loc>
<lastmod>${getLastMod()}</lastmod>
<changefreq>monthly</changefreq>
<priority>0.8</priority>
</url>`
    )
    .join("");

  res.type("application/xml");

res.set(
  "Cache-Control",
  "public, max-age=3600, s-maxage=3600"
);

const xml =
`${xmlHeader}<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;


setCache(
  "sitemap:static",
  xml,
  3600
);


res.send(xml);
};

/* ========================= CITY (PAGINATED) ========================= */

export const citySitemap = async (req, res) => {
  try {

    const page = Number(req.params.page || 1);

    const cacheKey = `sitemap:cities:${page}`;

    const cached = getCache(cacheKey);

    if (cached) {
      return res
        .type("application/xml")
        .send(cached);
    }

    const skip = (page - 1) * PAGE_SIZE;

    const cities = await City.find({ status: "active" })
      .select("slug updatedAt")
      .skip(skip)
      .limit(PAGE_SIZE)
      .lean();

    if (!cities.length) return res.status(404).send("City sitemap not found");

    const urls = cities
      .map(
        (city) => `
<url>
<loc>${FRONTEND_URL}/${city.slug}</loc>
<lastmod>${getLastMod(city.updatedAt)}</lastmod>
<changefreq>daily</changefreq>
<priority>0.8</priority>
</url>`
      )
      .join("");

    res.type("application/xml");

res.set(
  "Cache-Control",
  "public, max-age=3600, s-maxage=3600"
);

const xml =
`${xmlHeader}<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;


setCache(
  cacheKey,
  xml,
  3600
);


res.send(xml);
  } catch (err) {
    res.status(500).send("City sitemap error");
  }
};

/* ========================= CATEGORY (PAGINATED) ========================= */

export const categorySitemap = async (req, res) => {
  try {

    const page = Number(req.params.page || 1);

    const cacheKey = `sitemap:categories:${page}`;

    const cached = getCache(cacheKey);

    if (cached) {
      return res
        .type("application/xml")
        .send(cached);
    }

    const skip = (page - 1) * PAGE_SIZE;

    const categories = await Category.find({ status: "active" })
      .select("slug updatedAt")
      .skip(skip)
      .limit(PAGE_SIZE)
      .lean();

    if (!categories.length)
      return res.status(404).send("Category sitemap not found");

    const urls = categories
      .map(
        (cat) => `
<url>
<loc>${FRONTEND_URL}/category/${cat.slug}</loc>
<lastmod>${getLastMod(cat.updatedAt)}</lastmod>
<changefreq>weekly</changefreq>
<priority>0.8</priority>
</url>`
      )
      .join("");

    res.type("application/xml");

res.set(
  "Cache-Control",
  "public, max-age=3600, s-maxage=3600"
);

const xml =
`${xmlHeader}<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;


setCache(
  cacheKey,
  xml,
  3600
);


res.send(xml);
  } catch (err) {
    res.status(500).send("Category sitemap error");
  }
};

/* ========================= CITY-CATEGORY ========================= */

export const cityCategorySitemap = async (req, res) => {
  try {
    const page = Number(req.params.page || 1);

    const cacheKey = `sitemap:city-category:${page}`;

const cached = getCache(cacheKey);

if (cached) {
  return res
    .type("application/xml")
    .send(cached);
}

    const skip = (page - 1) * PAGE_SIZE;

    const data = await Business.aggregate([
      { $match: { status: "approved",
        isDeleted: false,
       } },
      {
        $group: {
          _id: {
            citySlug: "$citySlug",
            categorySlug: "$categorySlug",
          },
          updatedAt: { $max: "$updatedAt" },
        },
      },
      { $sort: { updatedAt: -1 } },
      { $skip: skip },
      { $limit: PAGE_SIZE },
    ]);

    if (!data.length)
      return res.status(404).send("City-category sitemap not found");

    const urls = data
      .map(
        (item) => `
<url>
<loc>${FRONTEND_URL}/${item._id.citySlug}/${item._id.categorySlug}</loc>
<lastmod>${getLastMod(item.updatedAt)}</lastmod>
<changefreq>daily</changefreq>
<priority>0.9</priority>
</url>`
      )
      .join("");

    res.type("application/xml");

res.set(
  "Cache-Control",
  "public, max-age=3600, s-maxage=3600"
);

const xml =
`${xmlHeader}<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;


setCache(
  cacheKey,
  xml,
  3600
);


res.send(xml);
  } catch (err) {
    res.status(500).send("City-category sitemap error");
  }
};

/* =========================
   CITY DEDICATED PAGES
========================= */

export const cityPagesSitemap = async (req, res) => {
  try {

    const page =
      Number(req.params.page || 1);

    const cacheKey =
      `sitemap:city-pages:${page}`;

    const cached =
      getCache(cacheKey);

    if (cached) {
      return res
        .type("application/xml")
        .send(cached);
    }

    const skip =
      (page - 1) * PAGE_SIZE;

    const cities =
      await City.find({
        status: "active",
      })
        .select("slug updatedAt")
        .skip(skip)
        .limit(PAGE_SIZE)
        .lean();

    if (!cities.length) {
      return res
        .status(404)
        .send("City pages sitemap not found");
    }

    /* =====================================================
       CITY DEDICATED PAGE LASTMOD DATA
    ===================================================== */

    const citySlugs =
      cities.map((city) => city.slug);

    const businessUpdates =
      await Business.aggregate([
        {
          $match: {
            status: "approved",
            isDeleted: false,
            citySlug: {
              $in: citySlugs,
            },
          },
        },
        {
          $group: {
            _id: "$citySlug",

            latestBusinessUpdate: {
              $max: "$updatedAt",
            },

            latestFeaturedUpdate: {
              $max: {
                $cond: [
                  { $eq: ["$isFeatured", true] },
                  "$updatedAt",
                  null,
                ],
              },
            },
          },
        },
      ]);

    const businessUpdateMap =
      new Map(
        businessUpdates.map((item) => [
          item._id,
          item,
        ])
      );

    /* =====================================================
       BUILD URLS
    ===================================================== */

    const urls =
      cities
        .map((city) => {

          const cityData =
            businessUpdateMap.get(
              city.slug
            );

          const cityLastMod =
            getLastMod(
              city.updatedAt
            );

          const latestBusinessLastMod =
            getLastMod(
              cityData?.latestBusinessUpdate ||
              city.updatedAt
            );

          const featuredLastMod =
            getLastMod(
              cityData?.latestFeaturedUpdate ||
              city.updatedAt
            );

          return `
<url>
<loc>${FRONTEND_URL}/${city.slug}/categories</loc>
<lastmod>${cityLastMod}</lastmod>
<changefreq>weekly</changefreq>
<priority>0.8</priority>
</url>

<url>
<loc>${FRONTEND_URL}/${city.slug}/featured-businesses</loc>
<lastmod>${featuredLastMod}</lastmod>
<changefreq>daily</changefreq>
<priority>0.8</priority>
</url>

<url>
<loc>${FRONTEND_URL}/${city.slug}/top-rated-businesses</loc>
<lastmod>${latestBusinessLastMod}</lastmod>
<changefreq>daily</changefreq>
<priority>0.8</priority>
</url>

<url>
<loc>${FRONTEND_URL}/${city.slug}/latest-businesses</loc>
<lastmod>${latestBusinessLastMod}</lastmod>
<changefreq>daily</changefreq>
<priority>0.8</priority>
</url>`;

        })
        .join("");

    res.type(
      "application/xml"
    );

    res.set(
      "Cache-Control",
      "public, max-age=3600, s-maxage=3600"
    );

    const xml =
      `${xmlHeader}` +
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">` +
      `${urls}` +
      `</urlset>`;

    setCache(
      cacheKey,
      xml,
      3600
    );

    res.send(xml);

  } catch (err) {

    console.error(
      "City pages sitemap error:",
      err
    );

    res
      .status(500)
      .send(
        "City pages sitemap error"
      );

  }
};

/* ========================= BUSINESS (PAGINATED) ========================= */

/* =========================
   BUSINESS (PAGINATED)
========================= */

export const businessSitemap = async (req, res) => {

  try {

    const page =
      Number(req.params.page || 1);


    /* =====================================================
       CACHE
    ===================================================== */

    const cacheKey =
      `sitemap:businesses:${page}`;


    const cached =
      getCache(cacheKey);


    if (cached) {

      return res
        .type("application/xml")
        .send(cached);

    }


    /* =====================================================
       PAGINATION
    ===================================================== */

    const skip =
      (page - 1) * PAGE_SIZE;


    /* =====================================================
       FETCH APPROVED BUSINESSES
    ===================================================== */

    const businesses =
      await Business.find({

        status: "approved",

        isDeleted: false,

      })
        .select(
          "slug citySlug categorySlug updatedAt images"
        )
        .sort({
          updatedAt: -1,
        })
        .skip(skip)
        .limit(PAGE_SIZE)
        .lean();


    /* =====================================================
       EMPTY PAGE
    ===================================================== */

    if (!businesses.length) {

      return res
        .status(404)
        .send(
          "Business sitemap not found"
        );

    }


    /* =====================================================
       BUILD URLS
    ===================================================== */

    const urls =
      businesses
        .map((business) => {

          const image =
            Array.isArray(
              business.images
            ) &&
            business.images.length > 0
              ? business.images[0]
              : "";


          return `
<url>
<loc>${FRONTEND_URL}/${business.citySlug}/${business.categorySlug}/${business.slug}</loc>
<lastmod>${getLastMod(business.updatedAt)}</lastmod>
<changefreq>daily</changefreq>
<priority>0.7</priority>
${
  image
    ? `
<image:image>
<image:loc>${image}</image:loc>
</image:image>`
    : ""
}
</url>`;

        })
        .join("");


    /* =====================================================
       RESPONSE
    ===================================================== */

    res.type(
      "application/xml"
    );


    res.set(
      "Cache-Control",
      "public, max-age=3600, s-maxage=3600"
    );


    const xml =
      `${xmlHeader}` +
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" ` +
      `xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">` +
      `${urls}` +
      `</urlset>`;


    /* =====================================================
       CACHE RESULT
    ===================================================== */

    setCache(
      cacheKey,
      xml,
      3600
    );


    res.send(xml);


  } catch (err) {

    console.error(
      "Business sitemap error:",
      err
    );

    res
      .status(500)
      .send(
        "Business sitemap error"
      );

  }

};