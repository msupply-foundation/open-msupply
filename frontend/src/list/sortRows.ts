import type { SortState } from '@/ui/elements/table/columnTypes';

// The client-side ordering for a bounded in-memory line set (the detail-view
// tables whose lines arrive whole: requisitions, internal orders, R&R forms).
// Only the mechanical half is shared — each vertical keeps its explicit
// sortValue switch (which fields a key reads is per-vertical behaviour).
// Extracted at the third identical copy (rule of three).
export const sortRows = <Row, K extends string>(
  rows: readonly Row[],
  sort: SortState<K>,
  sortValue: (row: Row, key: K) => string | number
): Row[] => {
  const dir = sort.desc ? -1 : 1;
  return [...rows].sort((a, b) => {
    const av = sortValue(a, sort.key);
    const bv = sortValue(b, sort.key);
    return av < bv ? -dir : av > bv ? dir : 0;
  });
};
