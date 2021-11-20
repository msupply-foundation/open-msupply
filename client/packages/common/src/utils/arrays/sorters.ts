const parseValue = <T, K extends keyof T>(object: T, key: K) => {
  const value = object[key];
  if (typeof value === 'string') {
    const valueAsNumber = Number.parseFloat(value);

    if (!Number.isNaN(valueAsNumber)) return valueAsNumber;
    return value.toUpperCase(); // ignore case
  }

  return value;
};

export const getDataSorter =
  <T, K extends keyof T>(sortKey: K, desc: boolean) =>
  (a: T, b: T): 1 | -1 | 0 => {
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
