const slugify = (text) => {
  if (!text) return "";

  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")        // spaces → -
    .replace(/[^\w-]+/g, "")     // remove special chars
    .replace(/--+/g, "-");       // remove double -
};

export default slugify;