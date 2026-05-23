// backend/utils/pingSitemap.js
import https from "https";

const ping = (url) =>
  new Promise((resolve) => {
    https
      .get(url, () => resolve())
      .on("error", () => resolve());
  });

const BASE_URL = "https://servdial.com";

export const pingGoogleSitemap = async () => {
  try {
    const urls = [
      `${BASE_URL}/sitemap.xml`, // index (MOST IMPORTANT)
      
      // optional but useful for faster discovery
      `${BASE_URL}/sitemap-static.xml`,
      `${BASE_URL}/sitemap-cities.xml`,
      `${BASE_URL}/sitemap-categories.xml`,
      `${BASE_URL}/sitemap-city-category.xml`,
    ];

    await Promise.all(
      urls.map((url) =>
        ping(`https://www.google.com/ping?sitemap=${encodeURIComponent(url)}`)
      )
    );

    console.log("✅ All sitemaps pinged successfully");
  } catch (err) {
    console.error("❌ Sitemap ping error:", err.message);
  }
};