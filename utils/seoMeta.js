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

const pluralizeCategory = (category = "") => {
  const words = category.toString().trim().split(/\s+/);

  if (!words.length) return "";

  const lastIndex = words.length - 1;
  const word = words[lastIndex];
  const lower = word.toLowerCase();

  // Already plural / uncountable category forms
  if (["fitness"].includes(lower)) {
    return category;
  }

  // Common irregular forms
  const irregular = {
    pharmacy: "pharmacies",
    bakery: "bakeries",
    category: "categories",
    company: "companies",
    agency: "agencies",
    pathology: "pathologies",
    nursery: "nurseries",
  };

  if (irregular[lower]) {
    words[lastIndex] = irregular[lower];
    return words.join(" ");
  }

  // Consonant + y → ies
  if (/[^aeiou]y$/i.test(word)) {
    words[lastIndex] = `${word.slice(0, -1)}ies`;
    return words.join(" ");
  }

  // s, x, z, ch, sh → es
  if (/(s|x|z|ch|sh)$/i.test(word)) {
    words[lastIndex] = `${word}es`;
    return words.join(" ");
  }

  // Default
  words[lastIndex] = `${word}s`;

  return words.join(" ");
};

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
const pluralCat = pluralizeCategory(cat);
const name = cleanText(businessName);
const location = area ? titleCase(area) : "";

  const keywords = [
    // =========================
    // CATEGORY + CITY
    // =========================
    `${cat} in ${c}`,
    `Best ${cat} in ${c}`,
    `Top ${cat} in ${c}`,
    `Verified ${cat} in ${c}`,
    `${cat} ${c}`,
    `${c} ${cat}`,

    `${pluralCat} in ${c}`,
    `Best ${pluralCat} in ${c}`,
    `Top ${pluralCat} in ${c}`,
    `Verified ${pluralCat} in ${c}`,
    `${pluralCat} ${c}`,
    `${c} ${pluralCat}`,

    // =========================
    // LOCAL SEARCH INTENT
    // =========================
    `${cat} near me`,
    `Best ${cat} near me`,
    `${cat} open now`,
    `${cat} near me open now`,

    `${pluralCat} near me`,
    `Best ${pluralCat} near me`,
    `${pluralCat} open now`,
    `${pluralCat} near me open now`,

    // =========================
    // SERVICE INTENT
    // =========================
    `${cat} services in ${c}`,
    `${cat} service in ${c}`,
    `professional ${cat} in ${c}`,
    `trusted ${cat} in ${c}`,
    `local ${cat} in ${c}`,

    `${pluralCat} in ${c}`,
    `professional ${pluralCat} in ${c}`,
    `trusted ${pluralCat} in ${c}`,
    `local ${pluralCat} in ${c}`,
    // =========================
    // SERVDIAL
    // =========================
    `ServDial ${cat}`,
    `ServDial ${cat} in ${c}`,
    `${cat} ServDial`,

    `ServDial ${pluralCat}`,
    `ServDial ${pluralCat} in ${c}`,
    `${pluralCat} ServDial`,
  ];

  // =========================
  // AREA BASED
  // =========================

  if (location) {
  keywords.push(
    `${cat} in ${location}`,
    `Best ${cat} in ${location}`,
    `Top ${cat} in ${location}`,
    `Verified ${cat} in ${location}`,
    `${location} ${cat}`,
    `${cat} near ${location}`,
    `${cat} services in ${location}`,
    `local ${cat} in ${location}`,

    `${pluralCat} in ${location}`,
    `Best ${pluralCat} in ${location}`,
    `Top ${pluralCat} in ${location}`,
    `Verified ${pluralCat} in ${location}`,
    `${location} ${pluralCat}`,
    `${pluralCat} near ${location}`,
    `${pluralCat} services in ${location}`,
    `local ${pluralCat} in ${location}`
  );
}

  // =========================
  // BUSINESS SPECIFIC
  // =========================

  if (name) {
    keywords.push(
      name,
      `${name} ${c}`,
      `${name} ${cat}`,
      `${name} in ${c}`,
      `${name} in ${location}`,

      `${name} phone number`,
      `${name} contact number`,
      `${name} address`,
      `${name} location`,
      `${name} opening hours`,
      `${name} review`,
      `${name} reviews`,
      `${name} photos`,
      `${name} services`
    );
  }

  // =========================
  // CLEAN + UNIQUE
  // =========================

  return [
    ...new Set(
      keywords
        .map(cleanText)
        .filter(Boolean)
    ),
  ];
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
  services = [],
  isVerified = false,

  citySlug = "",
  categorySlug = "",
  businessSlug = "",
}) => {

  const c = titleCase(city);
  const cat = titleCase(category);
  const name = cleanText(businessName);
  const location = area ? titleCase(area) : "";
  const serviceText = Array.isArray(services)
  ? services
      .map((service) => service?.name)
      .filter(Boolean)
      .map(cleanText)
      .filter(Boolean)
      .slice(0, 5)
      .join(", ")
  : "";

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
    `${name} is a ${isVerified ? "verified " : ""}${cat.toLowerCase()} in ${
      location ? `${location}, ` : ""
    }${c}${
      serviceText
        ? `, offering ${serviceText}`
        : ""
    }. Find contact details, business hours, ratings, reviews and more on ServDial.`;
} else {
  seoDescription =
    `Find top ${cat.toLowerCase()} services in ${
      location ? `${location}, ` : ""
    }${c}. Compare businesses, ratings, reviews, phone numbers, addresses, opening hours and services on ServDial.`;
}

  const cleanedDescription = cleanText(seoDescription);

  const maxDescriptionLength = 250;

  const finalDescription =
    cleanedDescription.length <= maxDescriptionLength
      ? cleanedDescription
      : `${cleanedDescription
          .slice(0, maxDescriptionLength - 3)
          .replace(/\s+\S*$/, "")
          .trim()}...`;

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