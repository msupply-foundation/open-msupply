import { createMemo, on, untrack, type Accessor } from 'solid-js';
import type { SortState } from '@/ui/elements/table/columnTypes';
import { sortRows } from './sortRows';

type SortValue = string | number;

// sortRows for an EDITABLE in-memory line set: the order is taken when the
// sort changes or a new line set arrives, never when a value changes. A plain
// memo over sortRows tracks every field sortValue reads, so typing into the
// sorted column (or any input feeding a derived sorted column) re-sorts on
// each keystroke — the keyed row moves and its focused input drops focus
// (issue #1742). Rows stay where they are while being edited, as the
// stocktake editor's batches do (issue #1005); choosing the sort again
// re-sorts on the current values.
//
// Only `rows()`'s own identity is tracked: a new array (a reseed) re-sorts,
// in-place edits to its items don't. The rows returned are the same objects,
// so edited values still reach the cells.
export const createSortedOnDemand = <Row, K extends string>(
  rows: Accessor<readonly Row[]>,
  sort: Accessor<SortState<K>>,
  sortValue: (row: Row, key: K) => SortValue
): Accessor<Row[]> => {
  const sorted = createMemo(
    on([rows, sort], ([r, s]) => untrack(() => sortRows(r, s, sortValue)))
  );
  return sorted;
};
