// Grouped rows (ui-standards § tables › grouped rows; meta.groupRows): runs of
// consecutive rows sharing a grouped column's value. Pure, so it is tested in
// node; DataTable runs it over the rows as rendered (sorted, paged) and the row
// renderer reads each cell's place in its run.

/** A cell's place in its column's run of equal values. */
export interface GroupPosition {
  /** The previous row has the same value: the cell shows blank. */
  continuesPrevious: boolean;
  /** The next row has the same value: the cell joins it, no divider between. */
  continuesNext: boolean;
}

// An empty value never groups: two blank cells are two absent values, not one.
const groupKey = (value: unknown): string | null =>
  value === null || value === undefined || value === '' ? null : String(value);

/** Each value's place in its run, in order. */
export const groupPositions = (values: readonly unknown[]): GroupPosition[] => {
  const keys = values.map(groupKey);
  return keys.map((key, i) => ({
    continuesPrevious: key !== null && i > 0 && keys[i - 1] === key,
    continuesNext: key !== null && i + 1 < keys.length && keys[i + 1] === key,
  }));
};

/**
 * The runs of a table with no grouped column: one shared empty map, so such a
 * table hands its rows the same answer however its rows change.
 */
export const NO_GROUP_RUNS: ReadonlyMap<string, GroupPosition> = new Map();

// Row groups (DataTable rowGroup; ui-standards § tables › row groups) — a
// different thing from the runs above: rows gathered under a group row that
// expands to them. The shape of TanStack's Row this needs, so it is tested
// without a table.
export interface GroupableRow<R> {
  getIsGrouped: () => boolean;
  getIsExpanded: () => boolean;
  subRows: R[];
}

/**
 * The rows a table draws, in order, from its top-level rows. A plain row
 * stays as it is; a group row is followed by its rows while expanded; a
 * group of ONE row is drawn as that row alone, since a group row over a
 * single row only restates it.
 */
export const displayedRows = <R extends GroupableRow<R>>(
  rows: readonly R[]
): R[] =>
  rows.flatMap(row => {
    if (!row.getIsGrouped()) return [row];
    if (row.subRows.length === 1) return row.subRows;
    return row.getIsExpanded() ? [row, ...row.subRows] : [row];
  });
