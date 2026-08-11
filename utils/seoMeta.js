// backend/utils/seoMeta.js

// =================================================
// HELPERS
// =================================================

const titleCase = (str = "") =>
  str
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());

const cleanText = (str = "") =>
  str
    .toString()
    .trim()
    .replace(/\s+/g, " ");

// =================================================
// KEYWORDS
// =================================================

const buildKeywords = ({
  city,
  category,
  businessName,
  area,
}) => {
  const c = titleCase(city);
  const cat = titleCase(category);
  const name = cleanText(businessName);
  const location = area ? titleCase(area) : "";

  const keywords = [
    `${cat} in ${c}`,
    `${cat} ${c}`,
    `${c} ${cat}`,
    `Best ${cat} in ${c}`,
    `Cheap ${cat} in ${c}`,
    `Cheap and best ${cat} in ${c}`,
    `Cheap & best ${cat} in ${c}`,
    `Top ${cat} in ${c}`,
    `Verified ${cat} in ${c}`,
    `${cat} near me`,
    `Best ${cat} near me`,
    `Cheap ${cat} near me`,
    `Cheap and best ${cat} near me`,
    `Cheap & best ${cat} near me`,
    `${cat} near me open now`,
    `${cat} services ${c}`,
    `ServDial ${cat} ${c}`,
  ];

  // Area based keywords

  if (location) {
    keywords.push(
      `${cat} in ${location}`,
      `Best ${cat} in ${location}`,
      `${location} ${cat}`,
      `${cat} near ${location}`
    );
  }

  // Business specific keywords

  if (name) {
    keywords.push(
      name,
      `${name} ${c}`,
      `${name} ${cat}`,
      `${name} phone number`,
      `${name} address`,
      `${name} review`,
      `${name} photo`,
      `${name} image`
    );
  }

  // Remove duplicates
  return [
    ...new Set(
      keywords
      .map(cleanText)
      .filter(Boolean))];
};

// =================================================
// KEYWORDS
// =================================================

export const generateMeta = ({
  city = "India",
  category = "Business",
  businessName = "",
  area = "",
  description = "",
  isVerified = false,

  // 🔥 Actual ServDial slugs
  citySlug = "",
  categorySlug = "",
  businessSlug = "",
}) => {

  const c = titleCase(city);
  const cat = titleCase(category);
  const name = cleanText(businessName);
  const location = area ? titleCase(area) : "";

  // ================= TITLE =================

  const title = name
    ? `${name} - ${cat} in ${c} | ServDial`
    : `Best ${cat} in ${c} | Verified Businesses & Reviews - ServDial`;

  // ================= H1 =================

  const h1 = name
    ? `${name} - ${cat} in ${c}`
    : `Best ${cat} in ${c}`;

  // ================= DESCRIPTION =================

  let seoDescription;

  if (name) {
    seoDescription =
      description ||
      `${name} is a ${isVerified ? "verified " : ""}${cat.toLowerCase()} in ${
        location ? `${location}, ` : ""
      }${c}. Find address, phone number, business hours, ratings, reviews and services on ServDial.`;
  } else {
    seoDescription =
      `Find top ${cat.toLowerCase()} services in ${c}. Compare verified businesses, ratings, reviews, phone numbers, addresses and opening hours on ServDial.`;
  }

  const finalDescription =
  cleanText(seoDescription).slice(0, 250);

  // ================= KEYWORDS =================

  const keywords = buildKeywords({
    city: c,
    category: cat,
    businessName: name,
    area: location,
  });

  // ================= CANONICAL =================
  let canonical;

  // 🔥 BUSINESS PAGE
  if (
    citySlug &&
    categorySlug &&
    businessSlug
  ) {
    canonical =
    `https://servdial.com/${citySlug}/${categorySlug}/${businessSlug}`;
  }
  
  // 🔥 CATEGORY PAGE
  else if (
    citySlug &&
    categorySlug
  ) {
    canonical =
    `https://servdial.com/${citySlug}/${categorySlug}`;
  }

  // 🔥 CITY PAGE
  else if (citySlug) {
    canonical =
    `https://servdial.com/${citySlug}`;
  }

  // 🔥 FALLBACK
  else {
    canonical =
    `https://servdial.com/${c
      .toLowerCase()
      .replace(/\s+/g, "-")}/${cat
        .toLowerCase()
        .replace(/\s+/g, "-")}`;
      }

  // ================= RETURN =================

  return {
    title,
    description: finalDescription,
    keywords,
    h1,

    robots: "index, follow, max-image-preview:large",

    ogTitle: title,
    ogDescription: finalDescription,

    twitterTitle: title,
    twitterDescription: finalDescription,

    canonical,
  };
};

export default generateMeta;