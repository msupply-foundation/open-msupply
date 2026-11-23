import type { ColumnSizingState } from '@tanstack/solid-table';

// The start and end rules of a column resize drag (#1890), split out of
// DataTable so they're unit-tested without a laid-out table. The DOM reading
// (the header's rendered width) and the commit stay in DataTable
// (startColumnResize and the drag-end effect); the decisions live here.

/** The dragged column and its width (px) when the drag started. */
export type ResizeStart = { id: string; px: number };

/**
 * A column's width as its header cell applies it: `px` is its size, and
 * `exact` says the column is drawn at exactly that width rather than with it
 * as a floor the table may stretch it past. A width the user set (a drag or a
 * double-click) is exact; a default isn't (DataTable.columnWidth).
 */
export type ColumnWidth = { px: number; exact: boolean };

/**
 * The column that fills the row, or `undefined` when none has to.
 *
 * A width the user set is exact, so the row's spare room goes to the columns
 * still on their defaults. Once every column drawn has a width the user set,
 * nothing is left to take it, and the browser shares it out over all of them
 * again — so a press that starts a drag (which sets the column to its drawn
 * width) would make it jump wider once more. The last column stays a floor
 * instead and fills the row, as the last column of a full-width table does.
 *
 * @param drawnIds the columns in the order they're drawn
 * @param sizing the widths the user set
 */
export const fillColumnId = (
  drawnIds: readonly string[],
  sizing: ColumnSizingState
): string | undefined =>
  drawnIds.every(id => sizing[id] !== undefined) ? drawnIds.at(-1) : undefined;

/**
 * The width (px) a drag should start from, or `undefined` to start from the
 * column's size as it is.
 *
 * TanStack starts a drag from the size, but a column on its default size has
 * that size only as a min-width floor, and its content or the table's spare
 * space usually draws it wider. Starting from the drawn width (rounded to a
 * whole pixel, as TanStack sizes are) makes the edge follow the pointer from
 * the first pixel, rather than sitting still until the pointer passes the
 * floor.
 *
 * @param renderedPx the header cell's drawn width
 * @param currentPx the column's size (`column.getSize()`)
 */
export const resizeStartWidth = (
  renderedPx: number,
  currentPx: number
): number | undefined => {
  const px = Math.round(renderedPx);
  return px === currentPx ? undefined : px;
};

/**
 * The dragged column and the width its drag starts from: the drawn width when
 * it differs from the size (resizeStartWidth), else the size. That's also what
 * a press that never moves leaves in the sizing, so resizeMoved compares like
 * with like. It matters on a capped column drawn wider than its cap (the
 * column that fills the row), whose size TanStack clamps to the cap.
 *
 * @param id the dragged column
 * @param renderedPx the header cell's drawn width
 * @param currentPx the column's size (`column.getSize()`)
 */
export const dragStart = (
  id: string,
  renderedPx: number,
  currentPx: number
): ResizeStart => ({
  id,
  px: resizeStartWidth(renderedPx, currentPx) ?? currentPx,
});

/**
 * Whether a finished drag changed the dragged column's width — only then is
 * it saved, so a press that never moves saves nothing (the drag's start width
 * included, which would otherwise turn a column's default into a saved one).
 * With no recorded start, the drag counts as a change and is saved.
 *
 * @param start the dragged column and its width at the start
 * @param pending the sizing the drag ended on
 */
export const resizeMoved = (
  start: ResizeStart | undefined,
  pending: ColumnSizingState
): boolean => !start || pending[start.id] !== start.px;
