export const getSumFn = key => (acc, obj) => obj[key] + acc;

export const getFilter = (matchVal, key) => obj => obj[key] === matchVal;

const parseValue = (object, key) => {
  const value = object[key];
  if (typeof value === 'string') {
    const valueAsNumber = Number.parseFloat(value);
    if (!Number.isNaN(valueAsNumber)) return valueAsNumber;
    return value.toUpperCase(); // ignore case
  }
  return value;
};

export const getDataSorter = (sortKey, desc) => (a, b) => {
  const valueA = parseValue(a, sortKey);
  const valueB = parseValue(b, sortKey);

  if (valueA < valueB) {
    return desc ? 1 : -1;
  }
  if (valueA > valueB) {
    return desc ? -1 : 1;
  }

  return 0;
};
