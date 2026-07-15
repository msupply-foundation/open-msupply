import {
  createEffect,
  createSignal,
  For,
  Match,
  on,
  Show,
  Switch,
} from 'solid-js';
import type { JSX } from 'solid-js';
import {
  createSolidTable,
  flexRender,
  functionalUpdate,
  getCoreRowModel,
  type Cell as TanCell,
  type ColumnDef,
  type ColumnOrderState,
  type ColumnPinningState,
  type ColumnSizingState,
  type Row as TanRow,
  type RowData,
  type RowSelectionState,
  type SortingState,
  type Updater,
  type VisibilityState,
} from '@tanstack/solid-table';
import { sortKeyToId, sortIdToKey } from './tableHelpers';
import type { TableConfig, TableConfigKey, ViewMode } from './tableConfig';
import { pxToRem, remToPx } from '../../utils/rem';
import { useFullScreen } from '../../layout/AppShell/shellContext';
import {
  CardViewIcon,
  MaximiseIcon,
  MinimiseIcon,
  SettingsIcon,
  TableViewIcon,
} from '../../icons';
import { Popover } from '../feedback/Popover';
import { LabelledValue } from '../typography/LabelledValue';
import { ColumnSettings } from './ColumnSettings';
import { t } from '../../../intl';
import styles from './DataTable.module.css';

// An untyped display convention → TanStack's `meta` bag (kdd/table-state: meta for flags
// that need no table-specific type). Augmented here so it's typed everywhere
// columnDef.meta is read (the cell helpers in tableHelpers.ts set align; the renderers
// below read it). A convention that needs the K generic goes on Column<T,K> instead.
declare module '@tanstack/solid-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    /** Text alignment for the cell + header — a display-only convention TanStack has no
     *  concept of; read by the renderers below and applied via a data-align attribute. */
    align?: 'left' | 'right' | 'center';
    /** Max number of lines this column's body cells may wrap to before truncating with an
     *  ellipsis (default is single-line nowrap). e.g. 2 = up to two lines then clamp. A
     *  display convention; applied via a --wrap-lines custom property on the cell. */
    wrapLines?: number;
    /** Where this column renders in CARD view (viewMode 'card'). 'primary' = the big
     *  top-left title, 'secondary' = the smaller line beneath it (e.g. a code), 'badge' =
     *  the top-right chip, 'grid' = a label-value pair in the 2-column grid below (the
     *  DEFAULT for un-annotated columns). Visibility is still governed by columnVisibility —
     *  a hidden column does not appear on the card either. See ui-standards § tables. */
    card?: 'primary' | 'secondary' | 'badge' | 'grid';
  }
}

// Generic, server-driven data table shared across list pages (kdd/explicit-composition
// treats the data table as its sanctioned config-driven exception: N columns × M rows is
// genuinely tabular, unlike a form). Built on TanStack Table; we route as much state
// handling through it as it genuinely owns and extend it type-safely — see
// kdd/table-state (meta for untyped flags like align; a typed field on Column<T,K> for
// typed ones like sortKey; pagination + sort/selection state stay page-owned). The
// component is presentational about *data* — it does not fetch, paginate, or sort rows
// itself; the page hands in the current page of rows already in the order it wants (see
// `manualSorting`).
//
// Ownership: the URL owns sort (the page hands in pre-ordered rows and the toggle comes
// back via onSort). Selection and pagination are the page's too — the page renders
// pagination (and the selection action bar) in its own contextual footer, not here. Full
// screen is the only state the DataTable owns.
//
// Header interactions: clicking a sortable header sorts. The toolbar has one control:
// full screen.

export type SortState<K extends string> = { key: K; desc: boolean };

// Columns are accessorKey-first (the intended TanStack shape): `accessorKey` gives the
// column its value — which makes it sortable natively and renders it with no `cell` —
// and derives the column `id` from that key. Add `cell` only when display differs from
// the raw value (a chip, a formatted date). `id` is optional: TanStack derives it from
// accessorKey; set it explicitly only for display columns (no accessor) or accessorFn
// columns. The one extension over a plain ColumnDef is `sortKey`: the GraphQL sort
// field, typed as a real K (a module augmentation of ColumnMeta can't carry K, since
// ColumnDef only parameterises over TData/TValue). It's usually equal to the accessorKey;
// the DataTable maps between the resolved column id and sortKey for the manual-sort
// round-trip. Display-only conventions (align) live in `meta` instead — kdd/table-state.
export type Column<T, K extends string> = ColumnDef<T> & {
  sortKey?: K;
};

export type DataTableProps<T, K extends string> = {
  columns: Column<T, K>[];
  rows: T[];
  rowKey: (row: T) => string;
  /** Current sort, or undefined when unsorted. */
  sort?: SortState<K>;
  /** Header click for a sortable column. TanStack computes the next direction (the
   *  asc → desc cycle); the page just records key + desc — e.g. into URL sort state. */
  onSort?: (key: K, desc: boolean) => void;
  /** When set, a row is clickable and calls this — e.g. navigate, or open an edit
   *  modal. Rows get a pointer cursor only when this is set. */
  onRowClick?: (row: T) => void;
  /** Message shown when there are no rows. */
  emptyMessage?: string;

  // --- Row selection, owned by the page. ---
  enableSelection?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;

  // --- Column config (order/sizing/pinning/visibility), owned by the page. ---
  // Controlled exactly like sort/selection (kdd/table-state): the page resolves the layers
  // (default → global → user) into ONE `config` (see createTableConfig) and this table
  // mirrors it into TanStack state; a column-state change calls setConfig with the RESOLVED
  // next value for that one field (this table applies TanStack's functional updater against
  // the current config first — see below — so the page just receives a value, like onSort).
  // Both optional — omit them and the table just uses TanStack's own defaults from `columns`.
  config?: TableConfig;
  setConfig?: <K extends TableConfigKey>(key: K, value: TableConfig[K]) => void;
};

export function DataTable<T, K extends string>(
  props: DataTableProps<T, K>
): JSX.Element {
  // Full screen is a shell-level mode (menu bar, app footer and page header all hide, so
  // the table + its footer fill the viewport — see AppShell/Page). The button just flips
  // the shared shell flag. Outside a shell (e.g. the component showcase) there's no
  // provider, so fall back to a local signal — the button still toggles, table-scoped.
  const shellFullScreen = useFullScreen();
  const [localFullScreen, setLocalFullScreen] = createSignal(false);
  const fullScreen = () => shellFullScreen?.isFullScreen() ?? localFullScreen();
  const setFullScreen = (value: boolean) =>
    shellFullScreen
      ? shellFullScreen.setFullScreen(value)
      : setLocalFullScreen(value);

  // --- Sort (manual: the page provides ordered rows and owns the sort state) ---
  // Controlled: the SortingState mirrors the page's props.sort, and a header click
  // notifies the page via onSort. The page speaks sortKey (the GraphQL field) while
  // TanStack keys SortingState by the resolved column id — sortKeyToId / sortIdToKey
  // map between them (see tableHelpers.ts).
  //
  // functionalUpdate is TanStack's own helper: onSortingChange is called with an updater
  // that may be a value OR a fn(old => next), so we apply it against the current sorting()
  // to read the concrete next state. TanStack has already computed the next direction, so
  // we pass its desc straight through rather than re-deriving the asc/desc cycle.
  const sorting = (): SortingState =>
    props.sort
      ? [
          {
            id: sortKeyToId(props.columns, props.sort.key),
            desc: props.sort.desc,
          },
        ]
      : [];
  const onSortingChange = (updater: Updater<SortingState>) => {
    const sort = functionalUpdate(updater, sorting())[0];
    if (!sort) return;
    const key = sortIdToKey(props.columns, sort.id);
    if (key) props.onSort?.(key, sort.desc);
  };

  // --- Selection ⇄ the page's selectedIds ---
  const rowSelection = (): RowSelectionState =>
    Object.fromEntries((props.selectedIds ?? []).map(id => [id, true]));
  const onRowSelectionChange = (u: Updater<RowSelectionState>) => {
    const next = functionalUpdate(u, rowSelection());
    props.onSelectionChange?.(Object.keys(next).filter(id => next[id]));
  };

  // --- Column config ⇄ the page's resolved config (order/sizing/pinning/visibility) ---
  // Each field mirrors props.config into TanStack state, with TanStack's own empty default
  // (an absent field means "TanStack decides" — declaration order, all visible, etc.). Each
  // on*Change resolves TanStack's updater against the current value (same as sort/selection
  // above) and hands the concrete value to setConfig — so the page receives a value, not an
  // updater. Inlined per field (no generic helper) — four small, click-through handlers.
  const columnOrder = (): ColumnOrderState => props.config?.columnOrder ?? [];
  const columnPinning = (): ColumnPinningState =>
    props.config?.columnPinning ?? {};
  const columnVisibility = (): VisibilityState =>
    props.config?.columnVisibility ?? {};

  // View mode is a config field but NOT a TanStack state (no on*Change) — read it directly.
  // Defaults to 'table' when unset. The toolbar switcher writes it via setConfig per band.
  const viewMode = (): ViewMode => props.config?.viewMode ?? 'table';

  // Column sizing crosses a unit boundary: config/appData stores REM (so widths scale with
  // the root font-size like the rest of the UI — see utils/rem), but TanStack works in PX.
  // So the state getter converts the stored rem → px, and commits convert px → rem.
  //
  // Live resize (columnResizeMode 'onChange') would otherwise persist on every drag tick.
  // Instead a TRANSIENT px signal overlays config DURING an active drag: onColumnSizingChange
  // writes it (keeps the column moving live, no persistence), and an effect commits px→rem
  // via setConfig once the drag ends, then clears it. Non-drag changes (the size input in
  // ColumnSettings) come through setConfig directly and persist immediately.
  const [transientSizing, setTransientSizing] =
    createSignal<ColumnSizingState | null>(null);
  const configSizingPx = (): ColumnSizingState => {
    const rem = props.config?.columnSizing ?? {};
    return Object.fromEntries(
      Object.entries(rem).map(([id, r]) => [id, remToPx(r)])
    );
  };
  const pxToRemSizing = (px: ColumnSizingState): ColumnSizingState =>
    Object.fromEntries(Object.entries(px).map(([id, p]) => [id, pxToRem(p)]));
  const columnSizing = (): ColumnSizingState =>
    transientSizing() ?? configSizingPx();

  const table = createSolidTable<T>({
    get data() {
      return props.rows;
    },
    get columns() {
      return props.columns;
    },
    state: {
      get sorting() {
        return sorting();
      },
      get rowSelection() {
        return rowSelection();
      },
      get columnOrder() {
        return columnOrder();
      },
      get columnSizing() {
        return columnSizing();
      },
      get columnPinning() {
        return columnPinning();
      },
      get columnVisibility() {
        return columnVisibility();
      },
    },
    manualSorting: true,
    enableSortingRemoval: false,
    enableColumnResizing: true,
    columnResizeMode: 'onChange',
    get enableRowSelection() {
      return props.enableSelection ?? false;
    },
    onSortingChange,
    onRowSelectionChange,
    onColumnOrderChange: u =>
      props.setConfig?.('columnOrder', functionalUpdate(u, columnOrder())),
    // Sizing (px): during a live resize drag, park it in the transient signal (moves the
    // column, no persistence); the effect below commits px→rem on drag end. Any other
    // sizing change (the ColumnSettings size input) persists immediately as rem.
    onColumnSizingChange: u => {
      const nextPx = functionalUpdate(u, columnSizing());
      if (table.getState().columnSizingInfo.isResizingColumn) {
        setTransientSizing(nextPx);
      } else {
        props.setConfig?.('columnSizing', pxToRemSizing(nextPx));
      }
    },
    onColumnPinningChange: u =>
      props.setConfig?.('columnPinning', functionalUpdate(u, columnPinning())),
    onColumnVisibilityChange: u =>
      props.setConfig?.(
        'columnVisibility',
        functionalUpdate(u, columnVisibility())
      ),
    getRowId: row => props.rowKey(row),
    getCoreRowModel: getCoreRowModel(),
  });

  // Commit a live resize once the drag ends: when isResizingColumn clears and we hold a
  // transient px sizing, convert it to rem, persist via setConfig, and drop the transient
  // (config, now updated, takes over as the source). Guarded by `on` so it only fires on
  // the resizing-state transition, not on unrelated reactivity.
  const isResizing = () => table.getState().columnSizingInfo.isResizingColumn;
  createEffect(
    on(isResizing, (resizing, wasResizing) => {
      if (wasResizing && !resizing) {
        const pending = transientSizing();
        if (pending) props.setConfig?.('columnSizing', pxToRemSizing(pending));
        setTransientSizing(null);
      }
    })
  );

  const leafColumnCount = () =>
    table.getVisibleLeafColumns().length + (props.enableSelection ? 1 : 0);

  // Inside a shell, full-screen is handled by hiding shell/page chrome — the table stays
  // in normal flow so its footer (pagination/selection) stays visible below it. Only the
  // standalone fallback (no shell, e.g. showcase) needs the table's own fixed overlay.
  const overlay = () => fullScreen() && !shellFullScreen;

  return (
    <div class={`${styles.root} ${overlay() ? styles.fullScreen : ''}`}>
      {/* Toolbar sits ABOVE the scroll area (not inside it), so it never scrolls with the
          table content and doesn't collide with the scroll region's rounded border. */}
      <div class={styles.toolbar}>
        {/* View-mode switcher — shows the OTHER mode's icon (in table view, the card icon
            to switch to cards, and vice versa). Writes viewMode for the current band via
            setConfig, so it persists + is per-breakpoint. Only when config is wired. */}
        <Show when={props.setConfig}>
          <button
            type="button"
            class={styles.controlButton}
            aria-label={
              viewMode() === 'card'
                ? t('table.view-table')
                : t('table.view-cards')
            }
            title={
              viewMode() === 'card'
                ? t('table.view-table')
                : t('table.view-cards')
            }
            data-testid="table-view-switch"
            onClick={() =>
              props.setConfig?.(
                'viewMode',
                viewMode() === 'card' ? 'table' : 'card'
              )
            }
          >
            {viewMode() === 'card' ? <TableViewIcon /> : <CardViewIcon />}
          </button>
        </Show>
        {/* Column settings — only when the page wired config controls (setConfig present);
            otherwise there's nothing to configure. Trigger lives here beside full-screen
            (OMS toolbar layout); the panel is the separate ColumnSettings, driven by the
            same config/setConfig this table already mirrors. */}
        <Show when={props.setConfig}>
          <Popover
            placement="bottom-end"
            trigger={<SettingsIcon />}
            triggerLabel={t('table.columns')}
            triggerClass={styles.controlButton}
          >
            <ColumnSettings
              table={table}
              config={props.config}
              setConfig={props.setConfig}
            />
          </Popover>
        </Show>
        <button
          type="button"
          class={`${styles.fullScreenButton} ${fullScreen() ? styles.controlButtonActive : ''}`}
          aria-label={t('table.toggle-full-screen')}
          data-testid="table-fullscreen"
          title={t('table.full-screen')}
          onClick={() => setFullScreen(!fullScreen())}
        >
          {fullScreen() ? <MinimiseIcon /> : <MaximiseIcon />}
        </button>
      </div>
      <div class={styles.tableScroll}>
        <Switch>
          <Match when={viewMode() === 'card'}>
            <CardView
              table={table}
              enableSelection={props.enableSelection ?? false}
              onRowClick={props.onRowClick}
              emptyMessage={props.emptyMessage}
            />
          </Match>
          <Match when={viewMode() === 'table'}>
            <table class={styles.table}>
              <thead>
                <For each={table.getHeaderGroups()}>
                  {headerGroup => (
                    <tr>
                      <Show when={props.enableSelection}>
                        <th class={`${styles.th} ${styles.selectCell}`}>
                          <input
                            type="checkbox"
                            aria-label={t('table.select-all')}
                            data-testid="select-all"
                            checked={table.getIsAllRowsSelected()}
                            onChange={table.getToggleAllRowsSelectedHandler()}
                          />
                        </th>
                      </Show>
                      <For each={headerGroup.headers}>
                        {header => <HeaderCell header={header} />}
                      </For>
                    </tr>
                  )}
                </For>
              </thead>
              <tbody>
                <Show
                  when={table.getRowModel().rows.length > 0}
                  fallback={
                    <tr>
                      <td class={styles.empty} colSpan={leafColumnCount()}>
                        {props.emptyMessage ?? t('table.no-results')}
                      </td>
                    </tr>
                  }
                >
                  <For each={table.getRowModel().rows}>
                    {row => (
                      <TableRow
                        row={row}
                        enableSelection={props.enableSelection ?? false}
                        onRowClick={props.onRowClick}
                      />
                    )}
                  </For>
                </Show>
              </tbody>
            </table>
          </Match>
        </Switch>
      </div>
    </div>
  );
}

// The alignment convention carried on a column's meta (set by the cell helpers).
const cellAlign = <T,>(
  cell: TanCell<T, unknown>
): 'left' | 'right' | 'center' | undefined => cell.column.columnDef.meta?.align;

// The wrap-lines convention: how many lines a cell may wrap to before truncating. Absent
// (or <= 1) means the default single-line nowrap. Returns the clamp count when > 1.
const cellWrapLines = <T,>(cell: TanCell<T, unknown>): number | undefined => {
  const lines = cell.column.columnDef.meta?.wrapLines;
  return lines && lines > 1 ? lines : undefined;
};

// A body row: its cells, clickable when onRowClick is set.
function TableRow<T>(props: {
  row: TanRow<T>;
  enableSelection: boolean;
  onRowClick?: (row: T) => void;
}): JSX.Element {
  return (
    <tr
      data-testid="table-row"
      class={props.onRowClick ? styles.rowClickable : undefined}
      // Selected rows get the same brand tint as selected cards (consistent selection
      // signal across both views); styled on the cells (data-selected) in CSS.
      data-selected={props.row.getIsSelected() ? '' : undefined}
      onClick={() => props.onRowClick?.(props.row.original)}
    >
      <Show when={props.enableSelection}>
        <td class={styles.selectCell}>
          <input
            type="checkbox"
            aria-label={t('table.select-row')}
            checked={props.row.getIsSelected()}
            onChange={props.row.getToggleSelectedHandler()}
            onClick={event => event.stopPropagation()}
          />
        </td>
      </Show>
      <For each={props.row.getVisibleCells()}>
        {cell => (
          <td
            class={styles.td}
            data-align={cellAlign(cell)}
            // data-wrap + --wrap-lines: when a column sets meta.wrapLines > 1, the cell
            // clamps to that many lines then ellipsises (CSS line-clamp); otherwise the
            // default single-line nowrap applies. min-width keeps the column-width floor.
            data-wrap={cellWrapLines(cell) ? '' : undefined}
            style={{
              'min-width': `${cell.column.getSize()}px`,
              ...(cellWrapLines(cell)
                ? { '--wrap-lines': String(cellWrapLines(cell)) }
                : {}),
            }}
          >
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </td>
        )}
      </For>
    </tr>
  );
}

// The card region a cell renders into (viewMode 'card'). Default 'grid' for un-annotated
// columns, per ui-standards § tables.
const cellCardRegion = <T,>(
  cell: TanCell<T, unknown>
): 'primary' | 'secondary' | 'badge' | 'grid' =>
  cell.column.columnDef.meta?.card ?? 'grid';

// The column's header text, for the grid label. Headers may be a string or JSX/function;
// only the string case yields a readable label (our columns use strings), else no label.
const columnHeaderText = <T,>(
  cell: TanCell<T, unknown>
): string | undefined => {
  const header = cell.column.columnDef.header;
  return typeof header === 'string' ? header : undefined;
};

// Card view — each row is a card (ui-standards § tables): primary identity top-left, a
// status badge top-right, a secondary line under the title, and the remaining fields as a
// label-value grid below. Reuses TanStack's row model + visible cells, routing each cell to
// its meta.card region; selection + row-click mirror the table's behaviour.
function CardView<T>(props: {
  table: import('@tanstack/solid-table').Table<T>;
  enableSelection: boolean;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
}): JSX.Element {
  const rows = () => props.table.getRowModel().rows;
  return (
    <Show
      when={rows().length > 0}
      fallback={
        <div class={styles.cardEmpty}>
          {props.emptyMessage ?? t('table.no-results')}
        </div>
      }
    >
      <div class={styles.cardGrid}>
        <For each={rows()}>
          {row => {
            const cells = () => row.getVisibleCells();
            const inRegion = (
              region: 'primary' | 'secondary' | 'badge' | 'grid'
            ) => cells().filter(c => cellCardRegion(c) === region);
            return (
              <div
                class={`${styles.card} ${props.onRowClick ? styles.rowClickable : ''}`}
                data-selected={row.getIsSelected() ? '' : undefined}
                onClick={() => props.onRowClick?.(row.original)}
              >
                <div class={styles.cardHeader}>
                  <Show when={props.enableSelection}>
                    <input
                      type="checkbox"
                      class={styles.cardSelect}
                      aria-label={t('table.select-row')}
                      checked={row.getIsSelected()}
                      onChange={row.getToggleSelectedHandler()}
                      onClick={event => event.stopPropagation()}
                    />
                  </Show>
                  <div class={styles.cardIdentity}>
                    <For each={inRegion('primary')}>
                      {cell => (
                        <div class={styles.cardPrimary}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </div>
                      )}
                    </For>
                    <For each={inRegion('secondary')}>
                      {cell => (
                        <div class={styles.cardSecondary}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </div>
                      )}
                    </For>
                  </div>
                  <For each={inRegion('badge')}>
                    {cell => (
                      <div class={styles.cardBadge}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </div>
                    )}
                  </For>
                </div>
                <Show when={inRegion('grid').length > 0}>
                  {/* Secondary fields — stacked label-above-value units (LabelledValue)
                      that WRAP intrinsically, not a fixed 2-col grid (ui-standards § tables;
                      CLAUDE.md #7). */}
                  <div class={styles.cardFields}>
                    <For each={inRegion('grid')}>
                      {cell => (
                        <LabelledValue label={columnHeaderText(cell)}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </LabelledValue>
                      )}
                    </For>
                  </div>
                </Show>
              </div>
            );
          }}
        </For>
      </div>
    </Show>
  );
}

// A header cell: a sortable label + a resize handle on the trailing edge.
function HeaderCell<T>(props: {
  header: import('@tanstack/solid-table').Header<T, unknown>;
}): JSX.Element {
  const column = () => props.header.column;
  const canSort = () => column().getCanSort();
  const canResize = () => column().getCanResize();
  const isResizing = () => column().getIsResizing();
  const align = () => column().columnDef.meta?.align;
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
      data-testid={canSort() ? `column-${column().id}` : undefined}
      // Auto table layout (columns flex to fill); getSize() is applied as a min-width FLOOR,
      // so a configured size / a resize drag widens the column without losing the auto-fill.
      style={{ 'min-width': `${column().getSize()}px` }}
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
