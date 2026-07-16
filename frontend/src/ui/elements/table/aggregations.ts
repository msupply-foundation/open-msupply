import type { AggregationFn } from '@tanstack/solid-table';

// Row-grouping aggregation (kdd/table-state) — the grouped-parent value each
// column shows. Pure TanStack AggregationFns, split out of DataTable.tsx so
// tableHelpers can use them without the component (and without the old
// DataTable ⇄ tableHelpers import cycle).
//
// When rows are GROUPED (see DataTable rowGroup) a parent row stands in for
// its leaves, and each column decides what its parent cell shows via TanStack's
// own `aggregationFn` (set directly on the column — we don't wrap it). TanStack
// ships 'sum' etc. by name; here are the extra custom ones a caller (or the
// cell helpers) can hand to `aggregationFn`.

// MULTIPLE is ONE typed, global constant so the "[multiple]" placeholder is
// spelled once; the renderer shows it literally, matching Open mSupply.
export const MULTIPLE = '[multiple]';

// The shared-or-[multiple] aggregation: the one shared leaf value (all equal)
// → that value; any disagreement → MULTIPLE. Use EXPLICITLY on a column that
// should show its shared value or nothing (the default for text columns; dates
// use the date variant below). A plain TanStack AggregationFn — pass it
// straight to a column's `aggregationFn`. Typed <any> like TanStack's own
// built-in aggregation fns (their row type is invariant, so a fixed T wouldn't
// fit an any-T column).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const sharedOrMultiple: AggregationFn<any> = (columnId, leafRows) => {
  const first = leafRows[0]?.getValue(columnId);
  const allEqual = leafRows.every(r => r.getValue(columnId) === first);
  return allEqual ? first : MULTIPLE;
};

// The date variant of sharedOrMultiple: compares by epoch-ms (Date.getTime)
// rather than the raw value, so equal dates in different representations (ISO
// string vs Date) still count as shared, and it's a fast numeric compare.
// Returns the FIRST leaf's raw value (so the column's own date cell still
// formats it) or MULTIPLE. The default for getDateCell.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const sharedOrMultipleDate: AggregationFn<any> = (
  columnId,
  leafRows
) => {
  const time = (v: unknown): number | undefined => {
    if (v == null) return undefined;
    const ms = new Date(v as string | number | Date).getTime();
    return Number.isNaN(ms) ? undefined : ms;
  };
  const first = leafRows[0]?.getValue(columnId);
  const firstTime = time(first);
  const allEqual = leafRows.every(
    r => time(r.getValue(columnId)) === firstTime
  );
  return allEqual ? first : MULTIPLE;
};
