import { SortKey, SortDirection } from "./types";

const getNestedValue = <T>(obj: T, path: SortKey): unknown => {
  if (!obj || !path) return null;
  return path.split(".").reduce((acc: unknown, key: string) => {
    if (acc && typeof acc === "object" && key in acc) {
      return (acc as Record<string, unknown>)[key];
    }
    return null;
  }, obj);
};

const compareValues = (
  aValue: unknown,
  bValue: unknown,
  isDesc: boolean
): number => {
  // Check for null or undefined values
  if (aValue == null && bValue == null) return 0;
  if (aValue == null) return isDesc ? -1 : 1;
  if (bValue == null) return isDesc ? 1 : -1;

  if (typeof aValue === "number" && typeof bValue === "number") {
    return isDesc ? bValue - aValue : aValue - bValue;
  }

  if (typeof aValue === "string" && typeof bValue === "string") {
    // Check if strings are date strings
    const aDate = new Date(aValue).getTime();
    const bDate = new Date(bValue).getTime();

    if (!isNaN(aDate) && !isNaN(bDate)) {
      return isDesc ? bDate - aDate : aDate - bDate;
    }

    // If not date strings, compare as regular strings
    const comparison = aValue.localeCompare(bValue);
    return isDesc ? -comparison : comparison;
  }

  return 0;
};

export const sortByKey = <T>(
  items: T[],
  sortKey?: SortKey,
  direction?: SortDirection
): T[] => {
  if (!items || items.length === 0 || !sortKey) {
    return items;
  }

  const isDesc = direction === "desc";

  return items.sort((a, b) => {
    const aValue = getNestedValue(a, sortKey);
    const bValue = getNestedValue(b, sortKey);
    return compareValues(aValue, bValue, isDesc);
  });
};
