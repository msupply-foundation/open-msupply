import { For, Show } from 'solid-js';
import type { JSX } from 'solid-js';
import {
  flexRender,
  type Cell as TanCell,
  type Column as TanColumn,
  type Row as TanRow,
} from '@tanstack/solid-table';
import { t } from '../../../intl';
import { BareCheckbox } from '../inputs/BareCheckbox';
import styles from './DataTable.module.css';

// The alignment convention carried on a column's meta (set by the cell
// helpers).
const cellAlign = <T,>(
  cell: TanCell<T, unknown>
): 'left' | 'right' | 'center' | undefined => cell.column.columnDef.meta?.align;

// The wrap-lines convention: how many lines a cell may wrap to before
// truncating. Absent (or <= 1) means the default single-line nowrap. Returns
// the clamp count when > 1.
const cellWrapLines = <T,>(cell: TanCell<T, unknown>): number | undefined => {
  const lines = cell.column.columnDef.meta?.wrapLines;
  return lines && lines > 1 ? lines : undefined;
};

// A body row: its cells, clickable when onRowClick is set. Extracted from
// DataTable.tsx (table-view row rendering).
export function TableRow<T>(props: {
  row: TanRow<T>;
  enableSelection: boolean;
  onRowClick?: (row: T) => void;
  /**
   * Semantic row state (ui-standards § tables row states) — 'verified' /
   * 'warning' / 'disabled', derived by the page from the record's own facts
   * (see DataTable's prop doc). Stamps data-row-state, styled in CSS.
   */
  rowState?: (row: T) => 'verified' | 'warning' | 'disabled' | undefined;
  /**
   * Semantic text tone for this row: 'info' for records awaiting an action
   * (placeholder / uncounted lines), 'error' for a line the server refused
   * (a failed bulk operation). Stamps data-tone, styled in CSS. Semantic
   * names only, mapped to palette tokens by the CSS — never colours.
   */
  rowTone?: (row: T) => 'info' | 'error' | undefined;
  /**
   * Sticky-pin style for a pinned data column's cell
   * (position/offset/z-index), else undefined.
   */
  pinnedStyle: (column: TanColumn<T>) => JSX.CSSProperties | undefined;
  /**
   * Sticky-pin style for a leading (select) cell at the given index (always
   * pinned left).
   */
  leadingPinnedStyle: (index: number) => JSX.CSSProperties;
  /**
   * Display-time tab filter: render a cell only when this returns true (see
   * columnInActiveTab).
   */
  cellVisible: (cell: TanCell<T, unknown>) => boolean;
}): JSX.Element {
  return (
    <tr
      data-testid="table-row"
      // The row's key (TanStack getRowId = the table's rowKey), so a caller can
      // address a specific row in the DOM (e.g. scroll it into view).
      data-row-key={props.row.id}
      class={props.onRowClick ? styles.rowClickable : undefined}
      data-row-state={
        !props.row.getIsGrouped()
          ? props.rowState?.(props.row.original)
          : undefined
      }
      data-tone={
        !props.row.getIsGrouped()
          ? props.rowTone?.(props.row.original)
          : undefined
      }
      // Selected rows get the same brand tint as selected cards (consistent
      // selection signal across both views); styled on the cells
      // (data-selected) in CSS.
      data-selected={props.row.getIsSelected() ? '' : undefined}
      onClick={() => props.onRowClick?.(props.row.original)}
    >
      <Show when={props.enableSelection}>
        <td
          class={styles.selectCell}
          data-pinned="left"
          style={props.leadingPinnedStyle(0)}
        >
          <BareCheckbox
            class={styles.selectBox}
            aria-label={t('table.select-row')}
            data-testid="select-row-checkbox"
            checked={props.row.getIsSelected()}
            onChange={props.row.getToggleSelectedHandler()}
            onClick={event => event.stopPropagation()}
          />
        </td>
      </Show>
      <For each={props.row.getVisibleCells()}>
        {cell => (
          <Show when={props.cellVisible(cell)}>
            <td
              class={styles.td}
              // Cross-FE test-id contract (e2e/TESTIDS.md): `cell-<columnId>`,
              // scoped by row (row.getByTestId('cell-batch')).
              data-testid={`cell-${cell.column.id}`}
              data-align={cellAlign(cell)}
              data-pinned={cell.column.getIsPinned() || undefined}
              // data-wrap + --wrap-lines: when a column sets meta.wrapLines >
              // 1, the cell clamps to that many lines then ellipsises (CSS
              // line-clamp); otherwise the default single-line nowrap applies.
              // min-width keeps the column-width floor. A pinned column
              // additionally gets sticky position + its edge offset.
              data-wrap={cellWrapLines(cell) ? '' : undefined}
              style={{
                'min-width': `${cell.column.getSize()}px`,
                ...(cellWrapLines(cell)
                  ? { '--wrap-lines': String(cellWrapLines(cell)) }
                  : {}),
                ...props.pinnedStyle(cell.column),
              }}
            >
              {/* Just flexRender the column's cell — TanStack's merged default cell renders the
                  leaf value (a column's custom `cell` overrides). */}
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </td>
          </Show>
        )}
      </For>
    </tr>
  );
}
