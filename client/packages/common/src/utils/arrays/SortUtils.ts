export const sortValues = <T>(
  a: T | string | number,
  b: T | string | number,
  desc: boolean
) => {
  if (a < b) {
    return desc ? 1 : -1;
  }
  if (a > b) {
    return desc ? -1 : 1;
  }

  return 0;
};

const parseValue = <T, K extends keyof T>(object: T, key: K) => {
  const value = object[key];
  if (typeof value === 'string') {
    const valueAsNumber = Number.parseFloat(value);

    if (!Number.isNaN(valueAsNumber)) return valueAsNumber;
    return value.toUpperCase(); // ignore case
  }

  return value;
};

const getSortByExpiry =
  (desc = false) =>
  (a: { expiryDate?: string | null }, b: { expiryDate?: string | null }) => {
    const expiryA = new Date(a.expiryDate ?? '');
    const expiryB = new Date(b.expiryDate ?? '');

    if (expiryA < expiryB) {
      return desc ? 1 : -1;
    }
    if (expiryA > expiryB) {
      return desc ? -1 : 1;
    }

    return 0;
  };

export const SortUtils = {
  getDataSorter:
    <T, K extends keyof T>(sortKey: K, desc: boolean) =>
    (a: T, b: T): 1 | -1 | 0 => {
      const valueA = parseValue(a, sortKey);
      const valueB = parseValue(b, sortKey);

      return sortValues(valueA, valueB, desc);
    },
  getColumnSorter:
    <T>(sortValueAccessor: (row: T) => string | number, desc: boolean) =>
    (a: T, b: T): 1 | -1 | 0 => {
      const valueA = sortValueAccessor(a);
      const valueB = sortValueAccessor(b);

      return sortValues(valueA, valueB, desc);
    },
  byExpiryAsc: getSortByExpiry(false),
  byExpiryDesc: getSortByExpiry(true),
};
