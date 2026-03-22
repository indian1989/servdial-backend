export const buildSearchQuery = (queryParams) => {
  const {
    q,
    city,
    category,
    rating,
    price,
    openNow,
  } = queryParams;

  const query = { status: "approved" };

  if (city) query.city = new RegExp(city, "i");
  if (category) query.category = new RegExp(category, "i");

  if (q) {
    query.$text = { $search: q };
  }

  if (rating) {
    query.averageRating = { $gte: Number(rating) };
  }

  if (price) {
    query.priceCategory = price; // low/medium/high
  }

  if (openNow === "true") {
    query.isOpen = true;
  }

  return query;
};