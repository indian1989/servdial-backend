import axios from "axios";

const SITEMAP_URL =
  process.env.SITEMAP_URL ||
  "https://api.servdial.com/sitemap.xml";

export const pingSearchEngines = async () => {
  try {
    const encoded = encodeURIComponent(SITEMAP_URL);

    await Promise.allSettled([
      axios.get(
        `https://www.google.com/ping?sitemap=${encoded}`
      ),

      axios.get(
        `https://www.bing.com/ping?sitemap=${encoded}`
      ),
    ]);

    console.log("✅ Search engines pinged");
  } catch (error) {
    console.error(
      "❌ Search engine ping failed:",
      error.message
    );
  }
};