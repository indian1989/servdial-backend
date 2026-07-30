// backend/services/seo/pingSearchEngines.js

import axios from "axios";

const FRONTEND_URL =
  process.env.FRONTEND_URL ||
  "https://servdial.com";

const SITEMAP_URL =
  process.env.SITEMAP_URL ||
  `${FRONTEND_URL}/sitemap.xml`;

const INDEXNOW_KEY =
  process.env.INDEXNOW_KEY;

/* =================================================
   SHARED AXIOS CLIENT
================================================= */

const http = axios.create({
  timeout: 10000,
  headers: {
    "User-Agent": "ServDial-SEO-Bot/1.0",
  },
});

/* =================================================
   GOOGLE SITEMAP PING
   (still useful, but sitemap submission in GSC is primary)
================================================= */

export const pingGoogle = async () => {
  try {
    const url =
      "https://www.google.com/ping?sitemap=" +
      encodeURIComponent(SITEMAP_URL);

    const res = await http.get(url);

    console.log("✅ Google sitemap pinged", res.status);

    return {
      success: true,
      status: res.status,
    };

  } catch (err) {

    console.error(
      "❌ Google ping failed:",
      err.response?.status || err.message
    );

    return {
      success: false,
      error: err.response?.status || err.message,
    };
  }
};

/* =================================================
   BING / INDEXNOW
================================================= */

export const pingBing = async (url) => {

  try {

    if (!INDEXNOW_KEY) {

      console.warn("⚠️ INDEXNOW_KEY missing");

      return {
        success: false,
        error: "INDEXNOW_KEY missing",
      };
    }

    if (!url) {

      console.warn("⚠️ URL missing for Bing ping");

      return {
        success: false,
        error: "URL missing",
      };
    }

    const payload = {
      host: new URL(FRONTEND_URL).host,
      key: INDEXNOW_KEY,
      urlList: [url],
    };

    const res = await http.post(
      "https://api.indexnow.org/indexnow",
      payload
    );

    console.log(
      "✅ Bing IndexNow pinged:",
      url,
      res.status
    );

    return {
      success: true,
      status: res.status,
    };

  } catch (err) {

    console.error(
      "❌ Bing ping failed:",
      url,
      err.response?.status || err.message
    );

    return {
      success: false,
      error: err.response?.status || err.message,
    };
  }
};

/* =================================================
   MULTI-URL INDEXNOW
================================================= */

export const pingBingBatch = async (urls = []) => {

  try {

    if (!INDEXNOW_KEY) {
      return {
        success: false,
        error: "INDEXNOW_KEY missing",
      };
    }

    const cleanUrls = urls.filter(Boolean);

    if (cleanUrls.length === 0) {
      return {
        success: false,
        error: "No URLs provided",
      };
    }

    const payload = {
      host: new URL(FRONTEND_URL).host,
      key: INDEXNOW_KEY,
      urlList: cleanUrls,
    };

    const res = await http.post(
      "https://api.indexnow.org/indexnow",
      payload
    );

    console.log(
      `✅ Bing batch pinged (${cleanUrls.length} URLs)`,
      res.status
    );

    return {
      success: true,
      count: cleanUrls.length,
      status: res.status,
    };

  } catch (err) {

    console.error(
      "❌ Bing batch ping failed:",
      err.response?.status || err.message
    );

    return {
      success: false,
      error: err.response?.status || err.message,
    };
  }
};

/* =================================================
   PING ALL SEARCH ENGINES
================================================= */

export const pingAll = async (url) => {

  const [google, bing] = await Promise.all([
    pingGoogle(),
    pingBing(url),
  ]);

  return {
    google,
    bing,
  };
};