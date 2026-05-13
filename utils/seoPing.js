import axios from "axios";

const FRONTEND_URL = process.env.FRONTEND_URL;
const API_URL = process.env.API_URL;

/* ================= GOOGLE ================= */
export const pingGoogle = async () => {
  try {
    await axios.get(
      `https://www.google.com/ping?sitemap=${API_URL}/sitemap.xml`
    );
    console.log("✅ Google sitemap pinged");
  } catch (err) {
    console.log("❌ Google ping failed");
  }
};

/* ================= BING INDEXNOW ================= */
export const pingBing = async (url) => {
  try {
    const key = process.env.INDEXNOW_KEY;

    await axios.post("https://api.indexnow.org/indexnow", {
      host: "servdial.com",
      key,
      urlList: [url],
    });

    console.log("✅ Bing IndexNow pinged");
  } catch (err) {
    console.log("❌ Bing ping failed");
  }
};