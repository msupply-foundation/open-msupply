const getNestedValue = (obj, path) => {
  return String(path)
    .split('.')
    .reduce((value, key) => (value != null ? value[key] : undefined), obj);
};

export const sortNodes = (nodes, sort, dir) => {
  if (!sort) return nodes;
  return [...nodes].sort((a, b) => {
    let valueA = getNestedValue(a, sort);
    let valueB = getNestedValue(b, sort);
    if (typeof valueA === 'string') valueA = valueA.toLowerCase();
    if (typeof valueB === 'string') valueB = valueB.toLowerCase();
    if (valueA == null && valueB == null) return 0;
    if (valueA == null) return dir === 'desc' ? 1 : -1;
    if (valueB == null) return dir === 'desc' ? -1 : 1;
    if (valueA < valueB) return dir === 'desc' ? 1 : -1;
    if (valueA > valueB) return dir === 'desc' ? -1 : 1;
    return 0;
  });
};
