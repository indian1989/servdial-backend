import Business from "../models/Business.js";
import City from "../models/City.js";
import Category from "../models/Category.js";

/* =========================
   CONFIG (IMPORTANT FIX)
========================= */

// Frontend domain (SEO indexing target)
const FRONTEND_URL =
  process.env.FRONTEND_URL || "https://servdial.com";

const getLastMod = (date) =>
  new Date(date || Date.now()).toISOString();

/* =========================
   HELPERS
========================= */

const xmlHeader = `<?xml version="1.0" encoding="UTF-8"?>`;

/* =========================
   SITEMAP INDEX
========================= */
export const sitemapIndex = async (req, res) => {
  const PAGE_SIZE = 5000;

  const businessCount = await Business.countDocuments({
    status: "approved",
  });

  const totalPages = Math.ceil(businessCount / PAGE_SIZE);

  const businessSitemaps = Array.from(
    { length: totalPages },
    (_, i) => `
<sitemap>
<loc>${FRONTEND_URL}/sitemap-businesses-${i + 1}.xml</loc>
</sitemap>`
  ).join("");

  const sitemap = `
<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">

<sitemap>
<loc>${FRONTEND_URL}/sitemap-static.xml</loc>
</sitemap>

<sitemap>
<loc>${FRONTEND_URL}/sitemap-cities.xml</loc>
</sitemap>

<sitemap>
<loc>${FRONTEND_URL}/sitemap-categories.xml</loc>
</sitemap>

<sitemap>
<loc>${FRONTEND_URL}/sitemap-services.xml</loc>
</sitemap>

${businessSitemaps}

</sitemapindex>`;

  res.header("Content-Type", "application/xml");
  res.send(sitemap.trim());
};

/* =========================
   STATIC PAGES
========================= */

export const staticSitemap = (req, res) => {
  const pages = [
    "",
    "/about",
    "/contact",
    "/privacy-policy",
    "/terms",
    "/disclaimer",
    "/advertise",
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

  const sitemap = `
${xmlHeader}
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

  res.header("Content-Type", "application/xml");
  res.send(sitemap.trim());
};

/* =========================
   CITY PAGES
========================= */

export const citySitemap = async (req, res) => {
  const cities = await City.find().select("slug updatedAt");

  const urls = cities
    .map(
      (city) => `
<url>
<loc>${FRONTEND_URL}/city/${city.slug}</loc>
<lastmod>${getLastMod(city.updatedAt)}</lastmod>
<changefreq>weekly</changefreq>
<priority>0.8</priority>
</url>`
    )
    .join("");

  const sitemap = `
${xmlHeader}
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

  res.header("Content-Type", "application/xml");
  res.send(sitemap.trim());
};

/* =========================
   CATEGORY PAGES
========================= */

export const categorySitemap = async (req, res) => {
  const categories = await Category.find().select("slug updatedAt");

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

  const sitemap = `
${xmlHeader}
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

  res.header("Content-Type", "application/xml");
  res.send(sitemap.trim());
};

/* =========================
   CITY + CATEGORY SEO PAGES
========================= */

export const serviceCitySitemap = async (req, res) => {
  const cities = await City.find().select("slug updatedAt");
const categories = await Category.find().select("slug updatedAt");

  let urls = "";

  for (const city of cities) {
    for (const cat of categories) {
      urls += `
<url>
<loc>${FRONTEND_URL}/${city.slug}/${cat.slug}</loc>
<lastmod>${getLastMod(
  city.updatedAt || cat.updatedAt
)}</lastmod>
<changefreq>weekly</changefreq>
<priority>0.9</priority>
</url>`;
    }
  }

  const sitemap = `
${xmlHeader}
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

  res.header("Content-Type", "application/xml");
  res.send(sitemap.trim());
};

/* =========================
   BUSINESS PAGES
========================= */

export const businessSitemap = async (req, res) => {
  try {
    const PAGE_SIZE = 5000;

const page = Number(req.params.page || 1);
const skip = (page - 1) * PAGE_SIZE;

const businesses = await Business.find({
  status: "approved",
})
  .select(
    "slug updatedAt image citySlug categorySlug"
  )
  .sort({ updatedAt: -1 })
  .skip(skip)
  .limit(PAGE_SIZE);

    const urls = businesses
      .map(
        (b) => `
<url>
<loc>${FRONTEND_URL}/${b.citySlug}/${b.categorySlug}/${b.slug}</loc>
<lastmod>${getLastMod(b.updatedAt)}</lastmod>
<changefreq>weekly</changefreq>
<priority>0.7</priority>
${
  b.image
    ? `
<image:image>
<image:loc>${b.image}</image:loc>
</image:image>`
    : ""
}
</url>`
      )
      .join("");

    const sitemap = `
<?xml version="1.0" encoding="UTF-8"?>
<urlset 
xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls}
</urlset>`;

    res.header("Content-Type", "application/xml");
    res.send(sitemap.trim());
  } catch (error) {
    console.error("Business Sitemap Error:", error);
    res.status(500).send("Error generating sitemap");
  }
};