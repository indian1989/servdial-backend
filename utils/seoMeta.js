// backend/utils/seoMeta.js

const titleCase = (str = "") =>
  str
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());

const buildKeywords = ({ city, category, businessName }) => {
  const c = titleCase(city);
  const cat = titleCase(category);

  const keywords = [
    `${cat} in ${c}`,
    `Best ${cat} in ${c}`,
    `Top ${cat} in ${c}`,
    `Verified ${cat} in ${c}`,
    `${cat} near me`,
    `${cat} services ${c}`,
    `ServDial ${cat} ${c}`,
  ];

  if (businessName) {
    keywords.push(`${businessName} ${c}`);
  }

  return keywords.join(", ");
};

export const generateMeta = ({
  city = "India",
  category = "Business",
  businessName = "",
  reviewCount = 0,
  isVerified = false,
}) => {
  const c = titleCase(city);
  const cat = titleCase(category);

  // ===== Title =====
  const title = businessName
    ? `${businessName} in ${c} | ${cat} - ServDial`
    : `Best ${cat} in ${c} | Verified Businesses & Reviews - ServDial`;

  // ===== Description =====
  const description = businessName
    ? `Find ${businessName} in ${c}. View address, phone number, business hours, ratings and customer reviews on ServDial.`
    : `Find top ${cat} services in ${c}. Compare verified businesses, ratings, reviews, phone numbers, addresses and opening hours on ServDial.`;

  // ===== Open Graph =====
  const ogTitle = title;
  const ogDescription = description;

  // ===== Structured SEO Helpers =====
  const robots = "index, follow";

  return {
    title,
    description,
    keywords: buildKeywords({
      city: c,
      category: cat,
      businessName,
    }),
    robots,
    ogTitle,
    ogDescription,
    twitterTitle: title,
    twitterDescription: description,
    canonical: businessName
      ? `https://servdial.com/${encodeURIComponent(c.toLowerCase())}/${encodeURIComponent(cat.toLowerCase())}/${encodeURIComponent(businessName.toLowerCase().replace(/\s+/g, "-"))}`
      : `https://servdial.com/${encodeURIComponent(c.toLowerCase())}/${encodeURIComponent(cat.toLowerCase())}`,
  };
};