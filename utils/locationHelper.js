export const normalizeLocation = (...parts) => {

  return parts
    .filter(Boolean)
    .map(item =>
      String(item).trim()
    )
    .filter(
      (item, index, arr) =>
        arr.findIndex(
          x =>
            x.toLowerCase() === item.toLowerCase()
        ) === index
    )
    .join(", ");

};