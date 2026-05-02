const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()

    // remove special chars
    .replace(/[^\w\s-]/g, "")

    // replace spaces with -
    .replace(/\s+/g, "-")

    // remove multiple -
    .replace(/--+/g, "-")

    // remove starting/ending -
    .replace(/^-+|-+$/g, "");
};

export default slugify;