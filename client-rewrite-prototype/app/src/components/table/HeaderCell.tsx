import type { CSSProperties } from 'react';
import { flexRender, type Header, type Table } from '@tanstack/react-table';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  GripVerticalIcon,
} from '@/components/icons';
import { cx } from '@/utils/classNames';
import styles from './DataTable.module.css';

const RESIZE_STEP = 16; // px per arrow press — keyboard column resize

/*
 * A header cell wires together the three header behaviours TanStack gives us
 * state for but no markup:
 *  - SORT: a <button> toggles sorting; the cell carries `aria-sort` and a
 *    visible arrow. (Announcements are done once, centrally, in DataTable.)
 *  - RESIZE: a focusable separator drives `getResizeHandler()` on pointer, and
 *    arrow keys on the keyboard — so resizing is operable without a mouse.
 *  - REORDER: a dedicated grip is the dnd-kit drag handle (keyboard-draggable),
 *    kept separate from the sort button so the two gestures don't collide.
 * Pinned columns are sticky (offset from `getStart`) and not draggable.
 */
export function HeaderCell<T>({
  header,
  table,
}: {
  header: Header<T, unknown>;
  table: Table<T>;
}) {
  const { column } = header;
  const isPinned = column.getIsPinned() === 'left';
  const canSort = column.getCanSort();
  const canResize = column.getCanResize();
  const canDrag = !isPinned && column.getCanHide();
  const sortDir = column.getIsSorted();
  const label = column.columnDef.meta?.label ?? column.id;
  const align = column.columnDef.meta?.align ?? 'start';

  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useSortable({ id: column.id, disabled: !canDrag });

  const style: CSSProperties = {
    width: `calc(var(--h-${header.id}-size) * 1px)`,
    ...(isPinned ? { insetInlineStart: `${column.getStart('left')}px` } : {}),
    ...(transform ? { transform: CSS.Translate.toString(transform) } : {}),
  };

  const ariaSort = !canSort
    ? undefined
    : sortDir === 'asc'
      ? 'ascending'
      : sortDir === 'desc'
        ? 'descending'
        : 'none';

  return (
    <th
      ref={setNodeRef}
      scope="col"
      colSpan={header.colSpan}
      aria-sort={ariaSort}
      data-align={align}
      className={cx(
        styles.th,
        isPinned && styles.pinned,
        isDragging && styles.dragging
      )}
      style={style}
    >
      <div className={styles.thInner}>
        {canDrag && (
          <button
            type="button"
            className={styles.grip}
            aria-label={`Reorder ${label} column`}
            {...attributes}
            {...listeners}
          >
            <GripVerticalIcon />
          </button>
        )}
        {canSort ? (
          <button
            type="button"
            className={styles.sortButton}
            onClick={column.getToggleSortingHandler()}
          >
            <span className={styles.thLabel}>
              {flexRender(column.columnDef.header, header.getContext())}
            </span>
            {sortDir === 'asc' && <ArrowUpIcon className={styles.sortIcon} />}
            {sortDir === 'desc' && <ArrowDownIcon className={styles.sortIcon} />}
          </button>
        ) : (
          <span className={styles.thLabel}>
            {flexRender(column.columnDef.header, header.getContext())}
          </span>
        )}
      </div>

      {canResize && (
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label={`Resize ${label} column`}
          tabIndex={0}
          className={cx(styles.resizer, column.getIsResizing() && styles.resizing)}
          onMouseDown={header.getResizeHandler()}
          onTouchStart={header.getResizeHandler()}
          onDoubleClick={() => column.resetSize()}
          onKeyDown={e => {
            if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
            e.preventDefault();
            const delta = e.key === 'ArrowRight' ? RESIZE_STEP : -RESIZE_STEP;
            const next = Math.max(
              column.columnDef.minSize ?? 40,
              column.getSize() + delta
            );
            table.setColumnSizing(prev => ({ ...prev, [column.id]: next }));
          }}
        />
      )}
    </th>
  );
}
