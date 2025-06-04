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
  (desc = false, nonExpiringLast = false) =>
  (a: { expiryDate?: string | null }, b: { expiryDate?: string | null }) => {
    if (nonExpiringLast) {
      if (!a.expiryDate) return 1;
      if (!b.expiryDate) return -1;
    }

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

const getSortByVVMStatus =
  () =>
  (
    a: { vvmStatus?: { level?: number } | null; expiryDate?: string | null },
    b: { vvmStatus?: { level?: number } | null; expiryDate?: string | null }
  ) => {
    // VVM level is the priority order of issuing (1 first)
    // This does not match VVM Status Stage (e.g. Stage 2 should be issued first, i.e. would be level 1)
    const aLevel = a.vvmStatus?.level;
    const bLevel = b.vvmStatus?.level;

    if (aLevel !== undefined && bLevel !== undefined) {
      if (aLevel < bLevel) return -1;
      if (aLevel > bLevel) return 1;
    } else if (aLevel !== undefined) {
      return -1;
    } else if (bLevel !== undefined) {
      return 1;
    }

    const expirySort = getSortByExpiry(false, true)(a, b);

    return expirySort;
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
  byExpiryAscNonExpiringLast: getSortByExpiry(false, true),
  byExpiryDesc: getSortByExpiry(true),
  byVVMStatusAsc: getSortByVVMStatus(),
};
