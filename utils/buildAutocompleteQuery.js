export const buildAutocompleteQuery = (searchText) => {
  if (!searchText || searchText.trim().length === 0) {
    return {};
  }

  const text = searchText.trim();

  return {
    $or: [
      { name: new RegExp(text, "i") },
      { category: new RegExp(text, "i") },
      { city: new RegExp(text, "i") },
      { tags: new RegExp(text, "i") },
    ],
  };
};