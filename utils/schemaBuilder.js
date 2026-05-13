export const businessSchema = (business) => ({
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: business.name,
  image: business.image,
  url: `https://servdial.com/business/${business.slug}`,
  address: {
    "@type": "PostalAddress",
    addressLocality: business.city?.name,
    addressRegion: business.state,
    addressCountry: "IN",
  },
  aggregateRating: business.rating
    ? {
        "@type": "AggregateRating",
        ratingValue: business.rating,
        reviewCount: business.reviewCount || 1,
      }
    : undefined,
});