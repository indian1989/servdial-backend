export const buildSearchQuery = ({
  city,
  category,
  keyword,
  rating,
  openNow,
}) => {
  const query = {};

  if (city) {
    query.city = new RegExp(city, "i");
  }

  if (category) {
    query.category = new RegExp(category, "i");
  }

  if (keyword) {
    query.$or = [
      { name: new RegExp(keyword, "i") },
      { category: new RegExp(keyword, "i") },
    ];
  }

  if (rating) {
    query.averageRating = { $gte: Number(rating) };
  }

  if (openNow) {
    query.isOpen = true; // optional future use
  }

  return query;
};