import Business from "../models/Business.js";
import City from "../models/City.js";
import Category from "../models/Category.js";

/* ========================= CONFIG ========================= */

const FRONTEND_URL =
  process.env.FRONTEND_URL || "https://servdial.com";

const PAGE_SIZE = 50000;

const getLastMod = (date) =>
  new Date(date || Date.now()).toISOString();

const xmlHeader = `<?xml version="1.0" encoding="UTF-8"?>`;

/* ========================= SITEMAP INDEX ========================= */

export const sitemapIndex = async (req, res) => {
  try {
    const businessCount = await Business.countDocuments({ status: "approved" });
    const cityCount = await City.countDocuments({ status: "active" });
    const categoryCount = await Category.countDocuments({ status: "active" });

    const businessPages = Math.ceil(businessCount / PAGE_SIZE);
    const cityPages = Math.ceil(cityCount / PAGE_SIZE);
    const categoryPages = Math.ceil(categoryCount / PAGE_SIZE);

    const businessMaps = Array.from(
      { length: businessPages },
      (_, i) => `
<sitemap>
<loc>${FRONTEND_URL}/sitemap-businesses-${i + 1}.xml</loc>
<lastmod>${new Date().toISOString()}</lastmod>
</sitemap>`
    ).join("");

    const cityMaps = Array.from(
      { length: cityPages },
      (_, i) => `
<sitemap>
<loc>${FRONTEND_URL}/sitemap-cities-${i + 1}.xml</loc>
<lastmod>${new Date().toISOString()}</lastmod>
</sitemap>`
    ).join("");

    const categoryMaps = Array.from(
      { length: categoryPages },
      (_, i) => `
<sitemap>
<loc>${FRONTEND_URL}/sitemap-categories-${i + 1}.xml</loc>
<lastmod>${new Date().toISOString()}</lastmod>
</sitemap>`
    ).join("");

    const sitemap = `
${xmlHeader}
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">

<sitemap>
<loc>${FRONTEND_URL}/sitemap-static.xml</loc>
<lastmod>${new Date().toISOString()}</lastmod>
</sitemap>

<sitemap>
<loc>${FRONTEND_URL}/sitemap-city-category.xml</loc>
<lastmod>${new Date().toISOString()}</lastmod>
</sitemap>

${cityMaps}
${categoryMaps}
${businessMaps}

</sitemapindex>`;

    res.header("Content-Type", "application/xml");
    res.send(sitemap.trim());
  } catch (err) {
    res.status(500).send("Error generating sitemap index");
  }
};

/* ========================= STATIC ========================= */

export const staticSitemap = async (req, res) => {
  const pages = ["", "/about", "/contact", "/privacy-policy", "/terms"];

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

  res.header("Content-Type", "application/xml");
  res.send(
    `${xmlHeader}<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`
  );
};

/* ========================= CITY (PAGINATED) ========================= */

export const citySitemap = async (req, res) => {
  try {
    const page = Number(req.params.page || 1);
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
<loc>${FRONTEND_URL}/city/${city.slug}</loc>
<lastmod>${getLastMod(city.updatedAt)}</lastmod>
<changefreq>weekly</changefreq>
<priority>0.8</priority>
</url>`
      )
      .join("");

    res.header("Content-Type", "application/xml");
    res.send(
      `${xmlHeader}<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`
    );
  } catch (err) {
    res.status(500).send("City sitemap error");
  }
};

/* ========================= CATEGORY (PAGINATED) ========================= */

export const categorySitemap = async (req, res) => {
  try {
    const page = Number(req.params.page || 1);
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

    res.header("Content-Type", "application/xml");
    res.send(
      `${xmlHeader}<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`
    );
  } catch (err) {
    res.status(500).send("Category sitemap error");
  }
};

/* ========================= CITY-CATEGORY ========================= */

export const cityCategorySitemap = async (req, res) => {
  try {
    const page = Number(req.params.page || 1);
    const skip = (page - 1) * PAGE_SIZE;

    const data = await Business.aggregate([
      { $match: { status: "approved" } },
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
<changefreq>weekly</changefreq>
<priority>0.9</priority>
</url>`
      )
      .join("");

    res.header("Content-Type", "application/xml");
    res.send(
      `${xmlHeader}<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`
    );
  } catch (err) {
    res.status(500).send("City-category sitemap error");
  }
};

/* ========================= BUSINESS (PAGINATED) ========================= */

export const businessSitemap = async (req, res) => {
  try {
    const page = Number(req.params.page || 1);
    const skip = (page - 1) * PAGE_SIZE;

    const businesses = await Business.find({ status: "approved" })
      .select("slug citySlug categorySlug updatedAt image")
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(PAGE_SIZE)
      .lean();

    if (!businesses.length)
      return res.status(404).send("Business sitemap not found");

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

    res.header("Content-Type", "application/xml");
    res.send(
      `${xmlHeader}<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">${urls}</urlset>`
    );
  } catch (err) {
    res.status(500).send("Business sitemap error");
  }
};