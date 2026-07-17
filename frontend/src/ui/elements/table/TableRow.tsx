import { For, Show } from 'solid-js';
import type { JSX } from 'solid-js';
import {
  flexRender,
  type Cell as TanCell,
  type Column as TanColumn,
  type Row as TanRow,
} from '@tanstack/solid-table';
import { ChevronDownIcon } from '../../icons';
import { t } from '../../../intl';
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
  /**
   * When grouped, a leading expander column is present; parent (expandable)
   * rows show a chevron.
   */
  showExpander: boolean;
  onRowClick?: (row: T) => void;
  /**
   * De-emphasise this row (read-only records — e.g. SHIPPED+ shipments,
   * ui-standards list-views): stamps data-dimmed, styled in CSS.
   */
  rowDimmed?: (row: T) => boolean;
  /**
   * Select/deselect ALL of a group row's leaves in one emit (called for a
   * grouped-row checkbox).
   */
  onToggleGroup: (row: TanRow<T>) => void;
  /**
   * Sticky-pin style for a pinned data column's cell
   * (position/offset/z-index), else undefined.
   */
  pinnedStyle: (column: TanColumn<T>) => JSX.CSSProperties | undefined;
  /**
   * Sticky-pin style for a leading (expander/select) cell at the given index
   * (always pinned left).
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
      class={props.onRowClick ? styles.rowClickable : undefined}
      data-dimmed={
        !props.row.getIsGrouped() && props.rowDimmed?.(props.row.original)
          ? ''
          : undefined
      }
      // Selected rows get the same brand tint as selected cards (consistent
      // selection signal across both views); styled on the cells
      // (data-selected) in CSS. A GROUP row shows the tint when ALL its leaves
      // are selected — mirroring its checkbox (its own id isn't stored, so
      // getIsSelected() would stay false).
      data-selected={
        (
          props.row.getIsGrouped()
            ? props.row.getIsAllSubRowsSelected()
            : props.row.getIsSelected()
        )
          ? ''
          : undefined
      }
      onClick={() => props.onRowClick?.(props.row.original)}
    >
      {/* Expander column (row grouping): its OWN leading column — the chevron on an expandable
          parent, blank otherwise (matches Open mSupply, which puts the chevrons before select). */}
      <Show when={props.showExpander}>
        <td
          class={styles.expanderCell}
          data-pinned="left"
          style={props.leadingPinnedStyle(0)}
        >
          <Show when={props.row.getCanExpand()}>
            <button
              type="button"
              class={styles.groupExpander}
              data-expanded={props.row.getIsExpanded() ? '' : undefined}
              aria-expanded={props.row.getIsExpanded()}
              aria-label={
                props.row.getIsExpanded()
                  ? t('table.collapse-group')
                  : t('table.expand-group')
              }
              onClick={event => {
                event.stopPropagation();
                props.row.toggleExpanded();
              }}
            >
              <ChevronDownIcon />
            </button>
          </Show>
        </td>
      </Show>
      <Show when={props.enableSelection}>
        <td
          class={styles.selectCell}
          data-pinned="left"
          style={props.leadingPinnedStyle(props.showExpander ? 1 : 0)}
        >
          {/* A GROUP row's checkbox is driven by its LEAVES, not the group's own selected state
              (we never store a group's synthetic id): checked when all sub-rows are selected,
              else unchecked (no indeterminate). Clicking it selects ALL leaves when not all are
              selected, else deselects them — so select-group → deselect-one-leaf (group unchecks)
              → click-group again cleanly re-selects all. A LEAF row uses the native handler. */}
          <input
            type="checkbox"
            aria-label={t('table.select-row')}
            data-testid="select-row-checkbox"
            checked={
              props.row.getIsGrouped()
                ? props.row.getIsAllSubRowsSelected()
                : props.row.getIsSelected()
            }
            onChange={
              props.row.getIsGrouped()
                ? () => props.onToggleGroup(props.row)
                : props.row.getToggleSelectedHandler()
            }
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
                  leaf value, the group value on a parent, and the aggregated value (via
                  aggregatedCell). Unlike TanStack's own grouping example we DON'T render null for a
                  placeholder (the grouped column on a CHILD row): flexRender gives the child's real
                  value, so a grouped child keeps showing e.g. its code/name — a blank there would
                  read as missing data (matches Open mSupply). The expander is its own column. */}
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </td>
          </Show>
        )}
      </For>
    </tr>
  );
}
