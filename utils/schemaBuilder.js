// backend/utils/schemaBuilder.js

/* =================================================
   HELPERS
================================================= */

const titleCase = (str = "") =>
  str
    .toString()
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());

const buildAddress = (address = {}) => {
  if (!address) return "";

  // Old string compatibility
  if (typeof address === "string") return address;

  return [
    address.street,
    address.area,
    address.landmark,
  ]
    .filter(Boolean)
    .join(", ");
};

/* =================================================
   DYNAMIC CATEGORY → SCHEMA TYPE
================================================= */

const resolveSchemaType = (category = "") => {
  const key = category.toLowerCase();

  // Food & hospitality
  if (/(restaurant|cafe|hotel|resort|banquet|dhaba|food|bakery|sweet|mithai)/i.test(key)) {
    return "Restaurant";
  }

  // Education
  if (/(school|college|university|coaching|institute|academy|tuition|education)/i.test(key)) {
    return "EducationalOrganization";
  }

  // Medical
  if (/(hospital|clinic|doctor|dentist|medical|pathology|pharmacy|health)/i.test(key)) {
    return "MedicalBusiness";
  }

  // Beauty
  if (/(salon|spa|beauty|parlour|barber)/i.test(key)) {
    return "BeautySalon";
  }

  // Fitness
  if (/(gym|fitness|yoga|sports)/i.test(key)) {
    return "SportsActivityLocation";
  }

  // Home services
  if (/(electrician|plumber|interior|carpenter|painter|construction|repair|cleaning)/i.test(key)) {
    return "HomeAndConstructionBusiness";
  }

  // Shopping / retail
  if (/(shop|store|mart|mall|retail|electronics|fashion|furniture|jewellery|mobile)/i.test(key)) {
    return "Store";
  }

  // Default
  return "LocalBusiness";
};

/* =================================================
   LOCAL BUSINESS SCHEMA
================================================= */

export const generateLocalBusinessSchema = (business = {}) => {
  const category =
    business.categoryName ||
    business.categorySlug ||
    business.categoryId?.name ||
    "Business";

  const type = resolveSchemaType(category);

  const cityName =
    business.cityName ||
    business.cityId?.name ||
    "";

  const latitude = business.location?.coordinates?.[1];
  const longitude = business.location?.coordinates?.[0];

  const businessUrl =
    business.url ||
    `https://servdial.com/${business.citySlug}/${business.categorySlug}/${business.slug}`;

  const addressText = buildAddress(business.address);

  const schema = {
    "@context": "https://schema.org",
    "@type": type,

    "@id": businessUrl,

    name: business.name,

    url: businessUrl,

    image:
      business.image ||
      (business.images?.length > 0
        ? business.images
        : business.logo
        ? [business.logo]
        : ["https://servdial.com/logo.png"]),

    telephone: business.phone || undefined,

    description:
      business.descriptionSEO ||
      `${business.name} is a trusted ${category} in ${cityName}. Find address, phone number, reviews, photos and services on ServDial.`,

    address: {
      "@type": "PostalAddress",
      streetAddress: addressText || undefined,
      addressLocality: titleCase(cityName),
      addressRegion: titleCase(business.state || ""),
      postalCode: business.pincode || undefined,
      addressCountry: "IN",
    },

    geo:
      latitude && longitude
        ? {
            "@type": "GeoCoordinates",
            latitude,
            longitude,
          }
        : undefined,

    aggregateRating:
      (business.averageRating || business.rating) > 0
        ? {
            "@type": "AggregateRating",
            ratingValue: Number(
              business.averageRating || business.rating
            ).toFixed(1),
            reviewCount:
              business.totalReviews ||
              business.reviewCount ||
              1,
          }
        : undefined,

    openingHoursSpecification: business.businessHours
      ? Object.entries(business.businessHours)
          .filter(([_, v]) => v?.open && v?.close && !v?.closed)
          .map(([day, v]) => ({
            "@type": "OpeningHoursSpecification",
            dayOfWeek: `https://schema.org/${titleCase(day)}`,
            opens: v.open,
            closes: v.close,
          }))
      : undefined,

    priceRange:
      business.priceRange ||
      (business.plan === "premium"
        ? "₹₹₹"
        : business.plan === "trusted"
        ? "₹₹"
        : "₹"),

    areaServed: titleCase(cityName),

    currenciesAccepted: "INR",

    paymentAccepted: "Cash, UPI, Card",

    sameAs: [business.website].filter(Boolean),
  };

  // Remove undefined / empty fields
  Object.keys(schema).forEach((key) => {
    if (
      schema[key] === undefined ||
      (Array.isArray(schema[key]) && schema[key].length === 0)
    ) {
      delete schema[key];
    }
  });

  return schema;
};

/* =================================================
   BREADCRUMB SCHEMA
================================================= */

export const generateBreadcrumbSchema = ({
  city,
  category,
  businessName,
  citySlug,
  categorySlug,
  businessSlug,
}) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",

  itemListElement: [
    {
      "@type": "ListItem",
      position: 1,
      name: "Home",
      item: "https://servdial.com",
    },
    {
      "@type": "ListItem",
      position: 2,
      name: titleCase(city),
      item: `https://servdial.com/${citySlug}`,
    },
    {
      "@type": "ListItem",
      position: 3,
      name: titleCase(category),
      item: `https://servdial.com/${citySlug}/${categorySlug}`,
    },
    {
      "@type": "ListItem",
      position: 4,
      name: businessName,
      item: `https://servdial.com/${citySlug}/${categorySlug}/${businessSlug}`,
    },
  ],
});

/* =================================================
   WEBSITE SCHEMA
================================================= */

export const generateWebsiteSchema = () => ({
  "@context": "https://schema.org",
  "@type": "WebSite",

  name: "ServDial",
  url: "https://servdial.com",

  potentialAction: {
    "@type": "SearchAction",
    target: "https://servdial.com/search?q={search_term_string}",
    "query-input": "required name=search_term_string",
  },
});