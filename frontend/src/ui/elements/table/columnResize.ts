import type { ColumnSizingState } from '@tanstack/solid-table';

// The start and end rules of a column resize drag (#1890), split out of
// DataTable so they're unit-tested without a laid-out table. The DOM reading
// (the header's rendered width) and the commit stay in DataTable
// (startColumnResize and the drag-end effect); the decisions live here.

/** The dragged column and its width (px) when the drag started. */
export type ResizeStart = { id: string; px: number };

/**
 * The width (px) a drag should start from, or `undefined` to start from the
 * column's size as it is.
 *
 * A column's size is only its min-width floor, and its content or the table's
 * spare space usually draws it wider — but TanStack starts a drag from the
 * size. So the first stretch of every drag only raised the hidden floor to the
 * visible edge and nothing moved. Starting from the drawn width (rounded to a
 * whole pixel, as TanStack sizes are) makes the edge follow the pointer from
 * the first pixel.
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
 * Whether a finished drag changed the dragged column's width — only then is
 * it saved, so a press that never moves saves nothing (the drag's start width
 * included, which would otherwise turn a column's default into a saved one).
 * With no recorded start, the drag is treated as a change, as before.
 *
 * @param start the dragged column and its width at the start
 * @param pending the sizing the drag ended on
 */
export const resizeMoved = (
  start: ResizeStart | undefined,
  pending: ColumnSizingState
): boolean => !start || pending[start.id] !== start.px;
