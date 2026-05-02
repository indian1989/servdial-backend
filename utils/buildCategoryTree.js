// backend/utils/buildCategoryTree.js

export const buildCategoryTree = (categories = []) => {
  const map = new Map();
  const roots = [];

  // STEP 1: Normalize
  categories.forEach((cat) => {
    const id = cat._id?.toString();

    if (!id) return; // safety

    map.set(id, {
      ...cat,
      _id: id,
      parentCategory: cat.parentCategory?.toString() || null,
      children: [],
    });
  });

  // STEP 2: Build tree
  map.forEach((node) => {
    const parentId = node.parentCategory;

    if (parentId && map.has(parentId)) {
      map.get(parentId).children.push(node);
    } else {
      roots.push(node);
    }
  });

  // STEP 3: Sort (stable)
  const sortTree = (nodes) => {
    nodes.sort((a, b) => {
      const orderA = a.order ?? 0;
      const orderB = b.order ?? 0;

      if (orderA !== orderB) return orderA - orderB;
      return a.name.localeCompare(b.name);
    });

    nodes.forEach((node) => {
      if (node.children.length) {
        sortTree(node.children);
      }
    });
  };

  sortTree(roots);

  return roots;
};