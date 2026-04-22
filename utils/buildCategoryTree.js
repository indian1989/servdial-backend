// backend/utils/buildCategoryTree.js

export const buildCategoryTree = (categories = []) => {
  const map = new Map();
  const roots = [];

  // STEP 1: Normalize + map
  categories.forEach((cat) => {
    map.set(cat._id.toString(), {
      ...cat,
      children: [],
    });
  });

  // STEP 2: Build hierarchy
  categories.forEach((cat) => {
    const id = cat._id.toString();
    const parentId = cat.parentCategory?.toString();

    if (parentId && map.has(parentId)) {
      map.get(parentId).children.push(map.get(id));
    } else {
      roots.push(map.get(id));
    }
  });

  // STEP 3: Optional sorting (VERY IMPORTANT for UI consistency)
  const sortTree = (nodes) => {
    nodes.sort((a, b) => {
      if (a.order !== undefined && b.order !== undefined) {
        return a.order - b.order;
      }
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