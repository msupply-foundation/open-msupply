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
