import { Show } from 'solid-js';
import type { JSX } from 'solid-js';
import { type Column as TanColumn, type Header } from '@tanstack/solid-table';
import { renderTemplate } from './renderTemplate';
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
  /**
   * Snap this column to the width of its widest content — the Excel auto-fit
   * gesture on the resize divider (issue #651). The measuring and the commit
   * are DataTable's (autoFitColumn); this cell only carries the gesture.
   */
  onAutoFit: (column: TanColumn<T>) => void;
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
          {/* renderTemplate, not TanStack's flexRender — flexRender untracks the
              header thunk, so `header: () => t('label.name')` never re-resolves
              on a locale change (see renderTemplate.ts). */}
          {renderTemplate(column().columnDef.header, props.header.getContext())}
        </span>
        {indicator()}
      </span>
      {/* Resize handle on the trailing edge. TanStack's getResizeHandler drives the drag
          (mouse + touch); we style a thin divider and highlight it while resizing. */}
      <Show when={canResize()}>
        <span
          class={`${styles.resizeHandle} ${isResizing() ? styles.resizeHandleActive : ''}`}
          // Two gestures on one press: a drag resizes, a DOUBLE-PRESS auto-fits
          // the column to its widest content — Excel's gesture (issue #651).
          //
          // Read off the second mousedown's `detail` (the browser's own
          // click-count: 2 when this press completes a double-click), NOT from
          // an onDblClick handler — neither click nor dblclick ever fires on
          // this handle. The first mousedown puts the table into resizing
          // state, which rebuilds TanStack's header objects, so <For>
          // re-creates this very element between the two presses (measured
          // 2026-08-18 — which is also why the onClick below never runs in
          // practice, and stays only as a guard for presses that don't
          // re-render). `detail` survives it: the browser counts presses by
          // position + time, not by element identity.
          //
          // The fit REPLACES the second press's drag (no drag is started), and
          // the first press's drag committed nothing — it never moved.
          // Mouse/trackpad only: a touch double-tap carries no click count, so
          // touch keeps drag-to-resize alone.
          onMouseDown={event => {
            if (event.detail >= 2) {
              props.onAutoFit(column());
              return;
            }
            props.header.getResizeHandler()(event);
          }}
          onTouchStart={props.header.getResizeHandler()}
          onClick={event => event.stopPropagation()}
          aria-hidden="true"
        />
      </Show>
    </th>
  );
}
