import type { SortState } from '@/ui/elements/table/columnTypes';

type SortValue = string | number;

// The client-side ordering for a bounded in-memory line set (the detail-view
// tables whose lines arrive whole: requisitions, internal orders, R&R forms;
// Manage › Plugins' one-read list). Only the mechanical half is shared — each
// vertical keeps its explicit sortValue switch (which fields a key reads is
// per-vertical behaviour). Extracted at the third identical copy (rule of
// three). `compare` replaces the default `<`/`>` where a key is not ordered
// that way (a version compared part by part as numbers). A stable sort, so
// ties keep the input order.
export const sortRows = <Row, K extends string>(
  rows: readonly Row[],
  sort: SortState<K>,
  sortValue: (row: Row, key: K) => SortValue,
  compare?: (a: SortValue, b: SortValue, key: K) => number
): Row[] => {
  const dir = sort.desc ? -1 : 1;
  return [...rows].sort((a, b) => {
    const av = sortValue(a, sort.key);
    const bv = sortValue(b, sort.key);
    if (compare) return dir * compare(av, bv, sort.key);
    return av < bv ? -dir : av > bv ? dir : 0;
  });
};
