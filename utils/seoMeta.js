export const generateMeta = ({ city, category }) => {
  return {
    title: `${category} in ${city} | Best Verified Services - ServDial`,
    description: `Find top ${category} services in ${city}. Verified businesses, ratings, and reviews.`,
  };
};