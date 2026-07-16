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
}): JSX.Element {
  const column = () => props.header.column;
  const canSort = () => column().getCanSort();
  const canResize = () => column().getCanResize();
  const isResizing = () => column().getIsResizing();
  const align = () => column().columnDef.meta?.align;
  const pin = () => props.pinnedStyle(column());
  const indicator = () => {
    const sorted = column().getIsSorted();
    if (!sorted) return null;
    return (
      <span class={styles.sortIndicator}>{sorted === 'desc' ? '▼' : '▲'}</span>
    );
  };
  return (
    <th
      class={styles.th}
      data-align={align()}
      data-pinned={column().getIsPinned() || undefined}
      data-testid={`header-${column().id}`}
      // Auto table layout (columns flex to fill); getSize() is applied as a
      // min-width FLOOR, so a configured size / a resize drag widens the column
      // without losing the auto-fill. A pinned column additionally gets sticky
      // position + its edge offset.
      style={{ 'min-width': `${column().getSize()}px`, ...pin() }}
    >
      <span
        class={`${styles.thLabel} ${canSort() ? styles.thSortable : ''}`}
        onClick={canSort() ? column().getToggleSortingHandler() : undefined}
      >
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
