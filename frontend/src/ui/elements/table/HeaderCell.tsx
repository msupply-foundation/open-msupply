import { Show } from 'solid-js';
import type { JSX } from 'solid-js';
import {
  flexRender,
  type Column as TanColumn,
  type Header,
} from '@tanstack/solid-table';
import styles from './DataTable.module.css';

// A header cell: a sortable label + a resize handle on the trailing edge.
// Extracted from DataTable.tsx (table-view header rendering).
export function HeaderCell<T>(props: {
  header: Header<T, unknown>;
  /**
   * Sticky-pin style for a pinned column (position/left/right/z-index), else
   * undefined.
   */
  pinnedStyle: (column: TanColumn<T>) => JSX.CSSProperties | undefined;
  /**
   * Which frozen block's OUTER edge this column sits on, if any — the boundary
   * the scrolling content passes. Carries the freeze cue (see
   * DataTable.module.css); columns inside a block carry none.
   */
  frozenEdge: (column: TanColumn<T>) => 'left' | 'right' | undefined;
}): JSX.Element {
  const column = () => props.header.column;
  const canSort = () => column().getCanSort();
  const canResize = () => column().getCanResize();
  const isResizing = () => column().getIsResizing();
  const align = () => column().columnDef.meta?.align;
  // A real growth cap (delivered as max-width). TanStack merges its default
  // maxSize (Number.MAX_SAFE_INTEGER) into every columnDef, so treat only a
  // value below that sentinel as an actual cap.
  const maxWidthPx = () => {
    const max = column().columnDef.maxSize;
    return max != null && max < Number.MAX_SAFE_INTEGER ? max : undefined;
  };
  const pin = () => props.pinnedStyle(column());
  const sorted = () => column().getIsSorted();
  // The arrow slot is RESERVED on every sortable header (empty until sorted,
  // fixed width — see .sortIndicator) so toggling a sort never shifts the
  // header text. Decorative: aria-sort on the th carries the semantics.
  const indicator = () => {
    if (!canSort()) return null;
    const dir = sorted();
    // The spec's arrow glyphs (ui-standards § tables .sort-arrow): ↓ / ↑
    // (U+2193 / U+2191), not filled triangles. Decorative — aria-sort on the
    // th carries the semantics.
    return (
      <span class={styles.sortIndicator} aria-hidden="true">
        {dir === 'desc' ? '↓' : dir === 'asc' ? '↑' : ''}
      </span>
    );
  };
  return (
    <th
      class={styles.th}
      data-align={align()}
      data-pinned={column().getIsPinned() || undefined}
      data-frozen-edge={props.frozenEdge(column())}
      // Keys this cell's RENDERED width back to its column when the sticky
      // offsets are measured (DataTable.measurePinnedOffsets).
      data-column-id={column().id}
      // Whole-cell sort target (spec .sortable): the toggle handler sits on the
      // th, not the label span; the resize handle stops click propagation.
      data-sortable={canSort() || undefined}
      onClick={canSort() ? column().getToggleSortingHandler() : undefined}
      aria-sort={
        sorted()
          ? sorted() === 'desc'
            ? 'descending'
            : 'ascending'
          : undefined
      }
      // Cross-FE test-id contract (e2e/TESTIDS.md): every header cell carries
      // `header-<columnId>`, sortable or not.
      data-testid={`header-${column().id}`}
      // Auto table layout (columns flex to fill); getSize() is the min-width
      // FLOOR (a column's `size`, or a resize drag) — a SOFT default the drag
      // moves both ways. maxSize is the growth cap, applied as max-width
      // (docs/CELL_TYPES.md). A pinned column additionally gets sticky position
      // + its edge offset.
      style={{
        'min-width': `${column().getSize()}px`,
        ...(maxWidthPx() !== undefined
          ? { 'max-width': `${maxWidthPx()}px` }
          : {}),
        ...pin(),
      }}
    >
      <span class={styles.thLabel}>
        {/* Header text wraps up to 2 lines (.thText clamp); the sort indicator is a
            separate non-shrinking sibling so it stays visible when the text wraps. */}
        <span class={styles.thText}>
          {flexRender(column().columnDef.header, props.header.getContext())}
        </span>
        {indicator()}
      </span>
      {/* Resize handle on the trailing edge. TanStack's getResizeHandler drives the drag
          (mouse + touch); we style a thin divider and highlight it while resizing. */}
      <Show when={canResize()}>
        <span
          class={`${styles.resizeHandle} ${isResizing() ? styles.resizeHandleActive : ''}`}
          onMouseDown={props.header.getResizeHandler()}
          onTouchStart={props.header.getResizeHandler()}
          onClick={event => event.stopPropagation()}
          aria-hidden="true"
        />
      </Show>
    </th>
  );
}
