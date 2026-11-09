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

/** A visible column, for choosing where a group row's label sits. */
export interface GroupLabelColumn {
  id: string;
  /** The column shows its own figure on a group row (a subtotal or a shared
   * value) — a figure the label must not stand in for. */
  aggregates: boolean;
}

/**
 * The column a group row's label — its grouped value and line count — sits in:
 * the first visible column that has NO group-row figure of its own, so the
 * label never hides a column's subtotal or shared value. The label is not
 * pinned to the grouped column's own cell, which is user-hideable and
 * re-orderable — pinning it there would drop the value and count whenever that
 * column is hidden, and move it around on reorder. Leading with the first
 * figure-free visible column keeps the label present and in one sensible place
 * however the columns are arranged. When every visible column aggregates, the
 * label falls back to the first visible column and shares the cell with that
 * column's figure (the row renderer draws the figure after the label), so no
 * subtotal is lost (ui-standards § tables › row groups). `columns` are the
 * row's visible columns in render order; undefined when none are visible.
 */
export const groupLabelColumnId = (
  columns: readonly GroupLabelColumn[]
): string | undefined =>
  (columns.find(column => !column.aggregates) ?? columns[0])?.id;

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
