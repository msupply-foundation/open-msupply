import { For, Show } from 'solid-js';
import type { JSX } from 'solid-js';
import {
  type Cell as TanCell,
  type Column as TanColumn,
  type Row as TanRow,
} from '@tanstack/solid-table';
import { t } from '../../../intl';
import { renderTemplate } from './renderTemplate';
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

// The monospace convention: code-like value cells render in --font-mono (set by
// the `code` cell kind). Value cells only — the header label stays sans.
const cellMono = <T,>(cell: TanCell<T, unknown>): boolean =>
  cell.column.columnDef.meta?.mono ?? false;

// A column's real growth cap in px (delivered as max-width), or undefined.
// TanStack merges its default maxSize (Number.MAX_SAFE_INTEGER) into every
// columnDef, so only a value below that sentinel counts as an actual cap.
const cellMaxWidthPx = <T,>(cell: TanCell<T, unknown>): number | undefined => {
  const max = cell.column.columnDef.maxSize;
  return max != null && max < Number.MAX_SAFE_INTEGER ? max : undefined;
};

// The full string a truncated single-line cell would reveal (issue #432): the
// plain-string leaf value. Strings only — numbers/dates/booleans render short
// and objects aren't display text — and only for non-wrapping cells (a wrapping
// cell shows its full text already). Cheap: a value read, no measurement.
const cellTitle = <T,>(cell: TanCell<T, unknown>): string | undefined => {
  if (cellWrapLines(cell)) return undefined;
  const value = cell.getValue();
  return typeof value === 'string' && value !== '' ? value : undefined;
};

// Native hover-reveal, gated on ACTUAL clipping (issue #432 follow-up, PR
// #638): a single-line cell overflows exactly when its content is wider than
// its box, so expose the full value as a `title` only then — a short value that
// fits gets no tooltip. Measured lazily on pointer-enter: one scrollWidth read
// on the single hovered cell, set well before the native tooltip's hover delay
// elapses — no render-time pass and no whole-table measurement, so the width
// model's perf posture is unchanged. Applies to every list table (shared row
// renderer).
const revealIfClipped = <T,>(
  td: HTMLTableCellElement,
  cell: TanCell<T, unknown>
): void => {
  const full = cellTitle(cell);
  if (full && td.scrollWidth > td.clientWidth) td.title = full;
  else td.removeAttribute('title');
};

// A body row: its cells, clickable when onRowClick is set. Extracted from
// DataTable.tsx (table-view row rendering).
export function TableRow<T>(props: {
  row: TanRow<T>;
  enableSelection: boolean;
  /** Render the row's selection checkbox disabled (see DataTable's prop). */
  selectionDisabled?: boolean;
  onRowClick?: (row: T) => void;
  /**
   * Semantic row state (ui-standards § tables row states) — 'verified' /
   * 'warning' / 'disabled', derived by the page from the record's own facts
   * (see DataTable's prop doc). Stamps data-row-state, styled in CSS.
   */
  rowState?: (row: T) => 'verified' | 'warning' | 'disabled' | undefined;
  /**
   * Semantic text tone for this row: 'info' for records awaiting an action
   * (placeholder / uncounted lines), 'warning' for a record needing attention
   * before it can proceed (a held batch), 'error' for a line the server
   * refused (a failed bulk operation). Stamps data-tone, styled in CSS.
   * Semantic names only, mapped to palette tokens by the CSS — never colours.
   */
  rowTone?: (row: T) => 'info' | 'warning' | 'error' | undefined;
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
   * Which frozen block's OUTER edge this column sits on, if any — the boundary
   * the scrolling content passes. Carries the freeze cue (see
   * DataTable.module.css); columns inside a block carry none.
   */
  frozenEdge: (column: TanColumn<T>) => 'left' | 'right' | undefined;
  /**
   * Is the leading (select) column itself that left edge? True when no data
   * column is pinned left, so the leading column IS the whole left block.
   */
  leadingIsFrozenEdge: boolean;
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
          data-frozen-edge={props.leadingIsFrozenEdge ? 'left' : undefined}
          style={props.leadingPinnedStyle(0)}
        >
          <BareCheckbox
            class={styles.selectBox}
            aria-label={t('table.select-row')}
            data-testid="select-row-checkbox"
            disabled={props.selectionDisabled}
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
              // Hover-reveal for an ellipsised value — set only when the cell
              // is actually clipped, measured on pointer-enter (issue #432
              // follow-up, PR #638). No static `title`, so cells that fit show
              // no tooltip.
              onMouseEnter={event => revealIfClipped(event.currentTarget, cell)}
              data-align={cellAlign(cell)}
              data-mono={cellMono(cell) ? '' : undefined}
              data-pinned={cell.column.getIsPinned() || undefined}
              data-frozen-edge={props.frozenEdge(cell.column)}
              // data-wrap + --wrap-lines: when a column sets meta.wrapLines >
              // 1, the cell clamps to that many lines then ellipsises (CSS
              // line-clamp); otherwise the default single-line nowrap applies.
              // min-width keeps the column-width floor (getSize()); maxSize is
              // the growth cap, applied as max-width (docs/CELL_TYPES.md).
              // TanStack merges its default maxSize (MAX_SAFE_INTEGER) into
              // every columnDef, so only a value below that sentinel is a real
              // cap. A pinned column additionally gets sticky position +
              // offset.
              data-wrap={cellWrapLines(cell) ? '' : undefined}
              style={{
                'min-width': `${cell.column.getSize()}px`,
                ...(cellMaxWidthPx(cell) !== undefined
                  ? { 'max-width': `${cellMaxWidthPx(cell)}px` }
                  : {}),
                ...(cellWrapLines(cell)
                  ? { '--wrap-lines': String(cellWrapLines(cell)) }
                  : {}),
                ...props.pinnedStyle(cell.column),
              }}
            >
              {/* Just render the column's cell — TanStack's merged default cell renders the
                  leaf value (a column's custom `cell` overrides). renderTemplate, not
                  TanStack's flexRender: the latter untracks the call, freezing every
                  locale-derived value (numbers, dates, money) until a reload. */}
              {renderTemplate(cell.column.columnDef.cell, cell.getContext())}
            </td>
          </Show>
        )}
      </For>
    </tr>
  );
}
