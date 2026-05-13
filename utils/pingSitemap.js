import https from "https";

const ping = (url) =>
  new Promise((resolve) => {
    https
      .get(url, () => resolve())
      .on("error", () => resolve());
  });

export const pingGoogleSitemap = async () => {
  const sitemapUrl = encodeURIComponent(
    "https://servdial.com/sitemap.xml"
  );

  await ping(
    `https://www.google.com/ping?sitemap=${sitemapUrl}`
  );

  console.log("✅ Google sitemap pinged");
};