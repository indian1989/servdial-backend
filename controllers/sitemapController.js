import Business from "../models/Business.js";
import City from "../models/City.js";
import Category from "../models/Category.js";

const baseUrl = "https://servdial.com";

const today = new Date().toISOString();

/* =========================
   SITEMAP INDEX
========================= */

export const sitemapIndex = (req, res) => {

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">

<sitemap>
<loc>${baseUrl}/sitemap-static.xml</loc>
</sitemap>

<sitemap>
<loc>${baseUrl}/sitemap-cities.xml</loc>
</sitemap>

<sitemap>
<loc>${baseUrl}/sitemap-categories.xml</loc>
</sitemap>

<sitemap>
<loc>${baseUrl}/sitemap-services.xml</loc>
</sitemap>

<sitemap>
<loc>${baseUrl}/sitemap-businesses.xml</loc>
</sitemap>

</sitemapindex>`;

res.header("Content-Type", "application/xml");
res.send(sitemap);

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
"/advertise"
];

const urls = pages.map(page => `
<url>
<loc>${baseUrl}${page}</loc>
<lastmod>${today}</lastmod>
<changefreq>monthly</changefreq>
<priority>0.8</priority>
</url>
`).join("");

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

res.header("Content-Type", "application/xml");
res.send(sitemap);

};

/* =========================
   CITY PAGES
========================= */

export const citySitemap = async (req, res) => {

const cities = await City.find().select("slug");

const urls = cities.map(city => `
<url>
<loc>${baseUrl}/city/${city.slug}</loc>
<lastmod>${today}</lastmod>
<changefreq>weekly</changefreq>
<priority>0.8</priority>
</url>
`).join("");

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

res.header("Content-Type", "application/xml");
res.send(sitemap);

};

/* =========================
   CATEGORY PAGES
========================= */

export const categorySitemap = async (req, res) => {

const categories = await Category.find().select("slug");

const urls = categories.map(cat => `
<url>
<loc>${baseUrl}/category/${cat.slug}</loc>
<lastmod>${today}</lastmod>
<changefreq>weekly</changefreq>
<priority>0.8</priority>
</url>
`).join("");

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

res.header("Content-Type", "application/xml");
res.send(sitemap);

};

/* =========================
   SERVICE + CITY SEO PAGES
========================= */

export const serviceCitySitemap = async (req, res) => {

const cities = await City.find().select("slug");
const categories = await Category.find().select("slug");

let urls = [];

cities.forEach(city => {

categories.forEach(cat => {

urls.push(`
<url>
<loc>${baseUrl}/${city.slug}/${cat.slug}</loc>
<lastmod>${today}</lastmod>
<changefreq>weekly</changefreq>
<priority>0.9</priority>
</url>
`);

});

});

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("")}
</urlset>`;

res.header("Content-Type", "application/xml");
res.send(sitemap);

};

/* =========================
   BUSINESS PAGES
========================= */

export const businessSitemap = async (req, res) => {

try {

const businesses = await Business.find({ status: "approved" })
.select("slug updatedAt image");

const urls = businesses.map(b => `
<url>

<loc>${baseUrl}/business/${b.slug}</loc>

<lastmod>${new Date(b.updatedAt).toISOString()}</lastmod>

<changefreq>weekly</changefreq>

<priority>0.7</priority>

${b.image ? `
<image:image>
<image:loc>${b.image}</image:loc>
</image:image>
` : ""}

</url>
`).join("");

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>

<urlset 
xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">

${urls}

</urlset>`;

res.header("Content-Type", "application/xml");
res.send(sitemap);

} catch (error) {

console.error("Business Sitemap Error:", error);

res.status(500).send("Error generating sitemap");

}

};