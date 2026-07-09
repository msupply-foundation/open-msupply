import { createSignal, For, Show } from 'solid-js';
import type { JSX } from 'solid-js';
import {
  createSolidTable,
  flexRender,
  getCoreRowModel,
  getGroupedRowModel,
  getExpandedRowModel,
  type Cell as TanCell,
  type Column as TanColumn,
  type ColumnDef,
  type ColumnOrderState,
  type ColumnPinningState,
  type ColumnSizingState,
  type GroupingState,
  type Row as TanRow,
  type RowSelectionState,
  type SortingState,
  type Table as TanTable,
  type Updater,
  type VisibilityState,
} from '@tanstack/solid-table';
import type { TableConfig } from './tableConfig';
import { clickOutside } from './clickOutside';
import styles from './DataTable.module.css';

// Generic, server-driven data table shared across list pages and the detail view
// (kdd/explicit-composition treats the data table as its sanctioned config-driven
// exception: N columns × M rows is genuinely tabular, unlike a form). Table *state* —
// sorting, row selection, grouping, and the column order/width/pinning/visibility
// models — is managed by TanStack Table via the Solid adapter; the component stays
// presentational about *data* (it does not fetch or paginate itself, and it does not
// sort rows — the page passes rows already in the order it wants; see `manualSorting`).
//
// Ownership: the URL owns sort (list: server sort; detail: front-end sort — either
// way the page hands in pre-ordered rows and the toggle comes back via onSort). The
// user owns column config (order/width/pinning/visibility) — fed in as `config`, out
// via onConfigChange for the page to persist (see tableConfig.ts). Selection and
// grouping are likewise the page's.
//
// Header interactions: clicking a sortable header sorts. Reorder / pin / show-hide
// live in the toolbar's Columns panel, not a per-column menu. The toolbar exposes
// four controls: full screen, Columns, Settings (reset), and — when a groupable
// column is given — Group by; plus, when onViewChange is given, a fifth table/card
// view toggle.
//
// View mode: the table can render its rows as an ordinary <table> or as a list of
// cards (one card per row, each listing the row's visible leaf columns as label/value
// pairs). Both share the SAME TanStack table instance and the SAME column `cell`
// functions, so an editable cell (an <input> in a `cell`) renders identically in each
// mode and keeps its focus — the card renderer is purely an alternate body over the
// same columns/rows.
//
// ⚠️ The engine chrome (toolbar controls, Columns panel, card layout, group bands)
// has placeholder styling — see DataTable.module.css.

export type Column<T, K extends string> = {
  /** Column header text. */
  header: string;
  /** Cell content for a row. */
  cell: (row: T) => JSX.Element;
  /** When set, the header is clickable and sorts by this GraphQL sort field. */
  sortKey?: K;
  /** Optional field-group label. Columns sharing a group are drawn together under one
   *  heading: as a labelled section in card view, and (when any column has a group) as
   *  a spanning band above the column headers in table view — mirroring the tabbed
   *  sections of Open mSupply's line edit. A group whose columns are ALL hidden is not
   *  rendered (no empty heading). Columns with no group render ungrouped/leading. */
  group?: string;
};

export type SortState<K extends string> = { key: K; desc: boolean };

export type DataTableProps<T, K extends string> = {
  columns: Column<T, K>[];
  rows: T[];
  rowKey: (row: T) => string;
  /** Current sort, or undefined when unsorted. */
  sort?: SortState<K>;
  /** Header click for a sortable column — the page decides toggle behaviour. */
  onSort?: (key: K) => void;
  /** When set, a row is clickable and calls this — e.g. navigate, or open an edit
   *  modal. Rows get a pointer cursor only when this is set. */
  onRowClick?: (row: T) => void;
  /** Message shown when there are no rows. */
  emptyMessage?: string;
  /** Content rendered below the table and *inside* the full-screen container — e.g.
   *  pagination and the selection footer. Kept here (rather than as a page sibling)
   *  so it stays visible when the table goes full screen. The page still owns what
   *  it is. */
  footer?: JSX.Element;

  // --- Column config (order / width / pinning / visibility), owned by the page. ---
  config?: TableConfig;
  onConfigChange?: (config: TableConfig) => void;

  // --- Row selection, owned by the page. ---
  enableSelection?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;

  // --- Grouping (control #4), owned by the page. ---
  /** The column id rows can be grouped by (e.g. an item column). When set, the
   *  Group-by control appears; grouping is off until toggled. Give each column a
   *  stable `sortKey` to use as the group id, or omit to disable grouping. */
  groupByColumn?: K;
  /** How to label the group header for a grouped set of rows. */
  groupLabel?: (row: T) => string;
  /** Whether grouping is currently on, and the toggle — owned by the page (so the
   *  detail view can remember it / react to it). */
  grouped?: boolean;
  onGroupedChange?: (grouped: boolean) => void;

  // --- View mode (table vs card) --------------------------------------------------
  /** Which body renderer to use. Card view shows one card per row, each card listing
   *  the row's *visible* leaf columns as label/value pairs (an editable cell renders
   *  its own input in the value slot) — so it tracks the same visibility/order the
   *  table uses. Defaults to 'table'. */
  view?: 'table' | 'card';
  /** When set, the table/card toggle control appears; the page owns the mode (e.g. the
   *  edit modal defaults it to 'card'). Omit to hide the toggle and stay a table. */
  onViewChange?: (view: 'table' | 'card') => void;
};

// A TanStack ColumnDef extended with our type-safe sortKey (see the part-1 note): we
// keep the array typed so we can read sortKey back as a real K, no assertion.
type ColumnDefWithSortKey<T, K extends string> = ColumnDef<T> & { sortKey?: K };

export function DataTable<T, K extends string>(props: DataTableProps<T, K>): JSX.Element {
  // Full screen is ephemeral view state (not persisted) — the DataTable owns it.
  const [fullScreen, setFullScreen] = createSignal(false);

  // Column id ⇄ our Column. sortKey is the id (so it is the testid, SortingState id,
  // and order/pin/size/group key). A no-op accessorFn enables the sort affordance for
  // manual sorting (getCanSort checks accessorFn); grouping needs a real group value,
  // so a groupable column reads its group label as its value.
  const columnDefs = (): ColumnDefWithSortKey<T, K>[] =>
    props.columns.map((col, index) => {
      const isGroupCol = col.sortKey != null && col.sortKey === props.groupByColumn;
      return {
        id: col.sortKey ?? `col-${index}`,
        sortKey: col.sortKey,
        header: col.header,
        // Field-group label carried through to the renderers via TanStack's meta.
        meta: { group: col.group },
        enableSorting: col.sortKey != null,
        enablePinning: true,
        enableGrouping: isGroupCol,
        ...(isGroupCol && props.groupLabel
          ? { accessorFn: (row: T) => props.groupLabel!(row) }
          : col.sortKey != null
            ? { accessorFn: () => null }
            : {}),
        cell: info => col.cell(info.row.original),
      };
    });

  const resolve = <S,>(updater: Updater<S>, current: S): S =>
    typeof updater === 'function' ? (updater as (old: S) => S)(current) : updater;

  // --- Sort (manual: the page provides ordered rows and owns the toggle) ---
  const sorting = (): SortingState =>
    props.sort ? [{ id: props.sort.key, desc: props.sort.desc }] : [];
  const onSortingChange = (updater: Updater<SortingState>) => {
    const next = resolve(updater, sorting());
    const id = next[0]?.id ?? sorting()[0]?.id;
    const sortKey = columnDefs().find(def => def.id === id)?.sortKey;
    if (sortKey) props.onSort?.(sortKey);
  };

  // --- Column config → TanStack state and back ---
  const columnOrder = (): ColumnOrderState => props.config?.columnOrder ?? [];
  const columnSizing = (): ColumnSizingState => props.config?.columnSizing ?? {};
  const columnPinning = (): ColumnPinningState =>
    props.config?.columnPinning ?? { left: [], right: [] };
  const columnVisibility = (): VisibilityState => props.config?.columnVisibility ?? {};

  const pushConfig = (patch: Partial<TableConfig>) =>
    props.onConfigChange?.({
      columnOrder: props.config?.columnOrder,
      columnSizing: props.config?.columnSizing,
      columnPinning: props.config?.columnPinning,
      columnVisibility: props.config?.columnVisibility,
      ...patch,
    });

  const onColumnOrderChange = (u: Updater<ColumnOrderState>) =>
    pushConfig({ columnOrder: resolve(u, columnOrder()) });
  const onColumnSizingChange = (u: Updater<ColumnSizingState>) =>
    pushConfig({ columnSizing: resolve(u, columnSizing()) });
  const onColumnPinningChange = (u: Updater<ColumnPinningState>) =>
    pushConfig({ columnPinning: resolve(u, columnPinning()) });
  const onColumnVisibilityChange = (u: Updater<VisibilityState>) =>
    pushConfig({ columnVisibility: resolve(u, columnVisibility()) });

  // --- Selection ⇄ the page's selectedIds ---
  const rowSelection = (): RowSelectionState =>
    Object.fromEntries((props.selectedIds ?? []).map(id => [id, true]));
  const onRowSelectionChange = (u: Updater<RowSelectionState>) => {
    const next = resolve(u, rowSelection());
    props.onSelectionChange?.(Object.keys(next).filter(id => next[id]));
  };

  // --- Grouping ⇄ the page's grouped flag ---
  const grouping = (): GroupingState =>
    props.grouped && props.groupByColumn ? [props.groupByColumn] : [];

  const table = createSolidTable<T>({
    get data() {
      return props.rows;
    },
    get columns() {
      return columnDefs();
    },
    state: {
      get sorting() {
        return sorting();
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
      get rowSelection() {
        return rowSelection();
      },
      get grouping() {
        return grouping();
      },
    },
    manualSorting: true,
    enableSortingRemoval: false,
    enableColumnResizing: true,
    columnResizeMode: 'onEnd',
    get enableRowSelection() {
      return props.enableSelection ?? false;
    },
    onSortingChange,
    onColumnOrderChange,
    onColumnSizingChange,
    onColumnPinningChange,
    onColumnVisibilityChange,
    onRowSelectionChange,
    getRowId: row => props.rowKey(row),
    getCoreRowModel: getCoreRowModel(),
    getGroupedRowModel: getGroupedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
  });

  const allSelected = () =>
    props.rows.length > 0 && (props.selectedIds?.length ?? 0) === props.rows.length;
  const toggleAll = () =>
    props.onSelectionChange?.(allSelected() ? [] : props.rows.map(props.rowKey));

  const leafColumnCount = () =>
    table.getVisibleLeafColumns().length + (props.enableSelection ? 1 : 0);

  const view = () => props.view ?? 'table';

  // Field-group support for the TABLE view: does any column declare a group, and — if so
  // — the runs of adjacent visible leaf columns sharing a group, for the spanning band
  // row. Reads getVisibleLeafColumns() so hidden columns drop out (a group with all
  // columns hidden yields no run). Column order is respected; a non-contiguous group
  // (split by another group's column) simply produces two bands, which is correct.
  // Rows for CARD view: always the LEAF rows, one card each. Cards don't render the
  // group-by control's aggregate headers, so when row-grouping is ON we bypass the
  // grouped model (which would emit parent rows AND their leaves — doubling the cards)
  // and use the CORE leaf rows. This table applies no filter row-model of its own (the
  // page hands in already-filtered/sorted rows; see manualSorting), so core rows are
  // exactly the page's rows. When grouping is OFF, getRowModel().rows are the same
  // leaves. Either way: one card per data row, no duplication, never empty.
  const cardRows = (): TanRow<T>[] =>
    grouping().length > 0 ? table.getCoreRowModel().rows : table.getRowModel().rows;

  const hasGroups = () => props.columns.some(c => c.group != null);
  const groupBands = (): { label: string | undefined; span: number }[] => {
    const bands: { label: string | undefined; span: number }[] = [];
    for (const col of table.getVisibleLeafColumns()) {
      const label = (col.columnDef.meta as { group?: string } | undefined)?.group;
      const last = bands[bands.length - 1];
      if (last && last.label === label) last.span += 1;
      else bands.push({ label, span: 1 });
    }
    return bands;
  };

  return (
    <div class={fullScreen() ? styles.fullScreen : undefined}>
      <TableControls
        table={table}
        config={props.config ?? {}}
        onConfigChange={cfg => props.onConfigChange?.(cfg)}
        fullScreen={fullScreen()}
        onToggleFullScreen={() => setFullScreen(f => !f)}
        groupByColumn={props.groupByColumn}
        grouped={props.grouped ?? false}
        onToggleGrouped={() => props.onGroupedChange?.(!props.grouped)}
        view={view()}
        onToggleView={
          props.onViewChange
            ? () => props.onViewChange!(view() === 'card' ? 'table' : 'card')
            : undefined
        }
      />
      {/* Body: the same TanStack table instance rendered as a <table> or as cards.
          Both iterate the same row model and column `cell`s, so an editable cell keeps
          its identity (and focus) across a mode toggle. */}
      <Show
        when={view() === 'card'}
        fallback={
          <div class={styles.tableScroll}>
            <table class={styles.table} style={{ width: `${table.getTotalSize()}px` }}>
              <thead>
                {/* Field-group band: one spanning cell per run of adjacent visible
                    columns sharing a Column.group, above the normal header row. Only
                    rendered when some column declares a group (plain tables stay flat).
                    A group with all columns hidden collapses out of the runs for free. */}
                <Show when={hasGroups()}>
                  <tr data-testid="group-band">
                    <Show when={props.enableSelection}>
                      <th class={`${styles.th} ${styles.selectCell} ${styles.groupBandCell}`} />
                    </Show>
                    <For each={groupBands()}>
                      {band => (
                        <th
                          class={styles.groupBandCell}
                          colSpan={band.span}
                          data-testid={band.label ? `group-band-${band.label}` : undefined}
                        >
                          {band.label ?? ''}
                        </th>
                      )}
                    </For>
                  </tr>
                </Show>
                <For each={table.getHeaderGroups()}>
                  {headerGroup => (
                    <tr>
                      <Show when={props.enableSelection}>
                        <th class={`${styles.th} ${styles.selectCell}`}>
                          <input
                            type="checkbox"
                            aria-label="Select all rows"
                            data-testid="select-all"
                            checked={allSelected()}
                            onChange={toggleAll}
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
                        {props.emptyMessage ?? 'No results.'}
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
          </div>
        }
      >
        <Show
          when={cardRows().length > 0}
          fallback={<div class={styles.empty}>{props.emptyMessage ?? 'No results.'}</div>}
        >
          <div class={styles.cardList}>
            <For each={cardRows()}>
              {row => (
                <CardRow
                  row={row}
                  enableSelection={props.enableSelection ?? false}
                  onRowClick={props.onRowClick}
                />
              )}
            </For>
          </div>
        </Show>
      </Show>
      {/* Footer (pagination, selection footer) lives inside the full-screen
          container so it stays visible when the table is full screen. */}
      {props.footer}
    </div>
  );
}

// The field-group label carried on a column's meta (set in columnDefs from Column.group).
const cellGroup = <T,>(cell: TanCell<T, unknown>): string | undefined =>
  (cell.column.columnDef.meta as { group?: string } | undefined)?.group;

// Partition a row's VISIBLE cells into ordered field-group sections. Preserves column
// order within a group and first-seen order across groups; cells with no group collect
// under an unlabelled leading section (label undefined). Because we start from
// getVisibleCells(), a group whose columns are all hidden simply never appears — that
// IS the "hide the group when all its columns are hidden" rule, for free.
function groupVisibleCells<T>(
  cells: TanCell<T, unknown>[]
): { label: string | undefined; cells: TanCell<T, unknown>[] }[] {
  const sections: { label: string | undefined; cells: TanCell<T, unknown>[] }[] = [];
  const byLabel = new Map<string | undefined, TanCell<T, unknown>[]>();
  for (const cell of cells) {
    const label = cellGroup(cell);
    let bucket = byLabel.get(label);
    if (!bucket) {
      bucket = [];
      byLabel.set(label, bucket);
      sections.push({ label, cells: bucket });
    }
    bucket.push(cell);
  }
  return sections;
}

// One card = one row. Skips grouped rows (cards and group-by aren't combined here).
// Renders the row's *visible* cells — the same visible/ordered leaf columns the table
// renders — as label/value fields, split into field-group sections (Column.group): a
// group with a label gets a heading, an empty group is omitted. Each field's body is
// flexRender of the same `cell` the table uses, so an editable cell renders its input
// here too. Row click / selection mirror TableRow.
function CardRow<T>(props: {
  row: TanRow<T>;
  enableSelection: boolean;
  onRowClick?: (row: T) => void;
}): JSX.Element {
  const sections = () => groupVisibleCells(props.row.getVisibleCells());
  const field = (cell: TanCell<T, unknown>) => (
    <div class={styles.cardField}>
      {/* Our Column.header is always a plain string (see the Column type), so render it
          directly rather than flexRender (which would need a HeaderContext here). */}
      <span class={styles.cardFieldLabel}>{String(cell.column.columnDef.header)}</span>
      <div>{flexRender(cell.column.columnDef.cell, cell.getContext())}</div>
    </div>
  );
  return (
    <Show when={!props.row.getIsGrouped()}>
      <div
        data-testid="card-row"
        class={`${styles.card} ${props.onRowClick ? styles.cardClickable : ''}`}
        onClick={() => props.onRowClick?.(props.row.original)}
      >
        <Show when={props.enableSelection}>
          <div class={styles.cardHeader}>
            <input
              type="checkbox"
              aria-label="Select row"
              checked={props.row.getIsSelected()}
              onChange={props.row.getToggleSelectedHandler()}
              onClick={event => event.stopPropagation()}
            />
          </div>
        </Show>
        <For each={sections()}>
          {section => (
            <Show
              when={section.label !== undefined}
              fallback={<For each={section.cells}>{field}</For>}
            >
              <section class={styles.cardGroup} data-testid="card-group">
                <div class={styles.cardGroupHeading}>{section.label}</div>
                <For each={section.cells}>{field}</For>
              </section>
            </Show>
          )}
        </For>
      </div>
    </Show>
  );
}

// A body row. A grouped row renders one spanning header (click to expand/collapse);
// a leaf row renders its cells, clickable when onRowClick is set.
function TableRow<T>(props: {
  row: TanRow<T>;
  enableSelection: boolean;
  onRowClick?: (row: T) => void;
}): JSX.Element {
  const colCount = () => props.row.getVisibleCells().length + (props.enableSelection ? 1 : 0);
  return (
    <Show
      when={!props.row.getIsGrouped()}
      fallback={
        <tr
          class={styles.groupHeaderRow}
          data-testid="group-header"
          onClick={() => props.row.toggleExpanded()}
        >
          <td class={styles.td} colSpan={colCount()}>
            <span class={styles.groupToggle}>{props.row.getIsExpanded() ? '▾' : '▸'}</span>
            {String(props.row.getGroupingValue(props.row.groupingColumnId!))} ({props.row.subRows.length})
          </td>
        </tr>
      }
    >
      <tr
        data-testid="table-row"
        class={props.onRowClick ? styles.rowClickable : undefined}
        onClick={() => props.onRowClick?.(props.row.original)}
      >
        <Show when={props.enableSelection}>
          <td class={styles.selectCell}>
            <input
              type="checkbox"
              aria-label="Select row"
              checked={props.row.getIsSelected()}
              onChange={props.row.getToggleSelectedHandler()}
              onClick={event => event.stopPropagation()}
            />
          </td>
        </Show>
        <For each={props.row.getVisibleCells()}>
          {cell => (
            <td
              class={`${styles.td} ${cell.column.getIsPinned() ? styles.pinnedLeft : ''}`}
              style={pinnedStyle(cell.column)}
            >
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </td>
          )}
        </For>
      </tr>
    </Show>
  );
}

// A header cell: sortable label + resize handle. No per-column menu — reorder/pin/
// visibility are in the toolbar Columns panel.
function HeaderCell<T>(props: {
  header: import('@tanstack/solid-table').Header<T, unknown>;
}): JSX.Element {
  const column = () => props.header.column;
  const canSort = () => column().getCanSort();
  const indicator = () => {
    const sorted = column().getIsSorted();
    if (!sorted) return null;
    return <span class={styles.sortIndicator}>{sorted === 'desc' ? '▼' : '▲'}</span>;
  };
  return (
    <th
      class={`${styles.th} ${column().getIsPinned() ? styles.pinnedLeft : ''}`}
      style={{ ...pinnedStyle(column()), position: 'relative', width: `${column().getSize()}px` }}
      data-testid={canSort() ? `column-${column().id}` : undefined}
    >
      <div class={styles.thInner}>
        <span
          class={`${styles.thLabel} ${canSort() ? styles.thSortable : ''}`}
          onClick={canSort() ? column().getToggleSortingHandler() : undefined}
        >
          {flexRender(column().columnDef.header, props.header.getContext())}
          {indicator()}
        </span>
      </div>
      <div
        class={styles.resizeHandle}
        onMouseDown={props.header.getResizeHandler()}
        onTouchStart={props.header.getResizeHandler()}
      />
    </th>
  );
}

// The header controls: full screen, Columns panel, Settings (reset), Group by, and —
// when onToggleView is given — a table/card view toggle.
function TableControls<T>(props: {
  table: TanTable<T>;
  config: TableConfig;
  onConfigChange: (config: TableConfig) => void;
  fullScreen: boolean;
  onToggleFullScreen: () => void;
  groupByColumn?: string;
  grouped: boolean;
  onToggleGrouped: () => void;
  view: 'table' | 'card';
  onToggleView?: () => void;
}): JSX.Element {
  const [columnsOpen, setColumnsOpen] = createSignal(false);
  const [settingsOpen, setSettingsOpen] = createSignal(false);

  const reset = (patch: Partial<TableConfig>, close: () => void) => {
    props.onConfigChange({ ...props.config, ...patch });
    close();
  };
  const has = (field: keyof TableConfig) => props.config[field] != null;
  const nothingCustomised = () =>
    !has('columnOrder') && !has('columnSizing') && !has('columnPinning') && !has('columnVisibility');

  return (
    <div class={styles.tableControls}>
      {/* 0 — Table / card view toggle (only when the page owns the mode). Shows the
          icon of the view you'd switch TO, so it reads as an action. */}
      <Show when={props.onToggleView}>
        <button
          type="button"
          class={`${styles.controlButton} ${props.view === 'card' ? styles.controlButtonActive : ''}`}
          aria-label={props.view === 'card' ? 'Switch to table view' : 'Switch to card view'}
          data-testid="table-view"
          title={props.view === 'card' ? 'Table view' : 'Card view'}
          onClick={props.onToggleView}
        >
          {props.view === 'card' ? '▤' : '▦'}
        </button>
      </Show>

      {/* 1 — Full screen */}
      <button
        type="button"
        class={`${styles.controlButton} ${props.fullScreen ? styles.controlButtonActive : ''}`}
        aria-label="Toggle full screen"
        data-testid="table-fullscreen"
        title="Full screen"
        onClick={props.onToggleFullScreen}
      >
        {props.fullScreen ? '🡼' : '⛶'}
      </button>

      {/* 2 — Columns: order, pin, visibility */}
      <div class={styles.controlWrapper} ref={clickOutside(() => setColumnsOpen(false))}>
        <button
          type="button"
          class={styles.controlButton}
          aria-label="Columns"
          data-testid="table-columns"
          title="Columns"
          onClick={() => setColumnsOpen(o => !o)}
        >
          ☰
        </button>
        <Show when={columnsOpen()}>
          <ColumnsPanel table={props.table} />
        </Show>
      </div>

      {/* 3 — Settings: reset */}
      <div class={styles.controlWrapper} ref={clickOutside(() => setSettingsOpen(false))}>
        <button
          type="button"
          class={styles.controlButton}
          aria-label="Table settings"
          data-testid="table-settings"
          title="Settings"
          onClick={() => setSettingsOpen(o => !o)}
        >
          ⚙
        </button>
        <Show when={settingsOpen()}>
          <div class={styles.columnsPanel}>
            <button
              class={styles.menuItem}
              type="button"
              disabled={!has('columnOrder')}
              onClick={() => reset({ columnOrder: undefined }, () => setSettingsOpen(false))}
            >
              Reset column order
            </button>
            <button
              class={styles.menuItem}
              type="button"
              disabled={!has('columnSizing')}
              onClick={() => reset({ columnSizing: undefined }, () => setSettingsOpen(false))}
            >
              Reset column widths
            </button>
            <button
              class={styles.menuItem}
              type="button"
              disabled={!has('columnPinning')}
              onClick={() => reset({ columnPinning: undefined }, () => setSettingsOpen(false))}
            >
              Reset pinned columns
            </button>
            <button
              class={styles.menuItem}
              type="button"
              disabled={!has('columnVisibility')}
              onClick={() => reset({ columnVisibility: undefined }, () => setSettingsOpen(false))}
            >
              Show all columns
            </button>
            <button
              class={styles.menuItem}
              type="button"
              data-testid="reset-table-defaults"
              disabled={nothingCustomised()}
              onClick={() =>
                reset(
                  {
                    columnOrder: undefined,
                    columnSizing: undefined,
                    columnPinning: undefined,
                    columnVisibility: undefined,
                  },
                  () => setSettingsOpen(false)
                )
              }
            >
              Reset all
            </button>
          </div>
        </Show>
      </div>

      {/* 4 — Group by (only when the page provides a groupable column) */}
      <Show when={props.groupByColumn}>
        <button
          type="button"
          class={`${styles.controlButton} ${props.grouped ? styles.controlButtonActive : ''}`}
          aria-label="Group by item"
          data-testid="table-group"
          title="Group by item"
          onClick={props.onToggleGrouped}
        >
          ⊞
        </button>
      </Show>
    </div>
  );
}

// The Columns panel: every column in current order, each with up/down reorder,
// a pin toggle, and a visibility checkbox. Drives the table's own setters, which
// route through the config change handlers above.
function ColumnsPanel<T>(props: { table: TanTable<T> }): JSX.Element {
  // Ordered, non-select leaf columns.
  const cols = () => props.table.getAllLeafColumns().filter(c => c.id !== 'mrt-select');
  const orderedIds = () => cols().map(c => c.id);

  const move = (id: string, delta: number) => {
    const ids = orderedIds();
    const from = ids.indexOf(id);
    const to = from + delta;
    if (from < 0 || to < 0 || to >= ids.length) return;
    const next = ids.filter(x => x !== id);
    next.splice(to, 0, id);
    props.table.setColumnOrder(next);
  };

  return (
    <div class={styles.columnsPanel} data-testid="columns-panel">
      <For each={cols()}>
        {(column, index) => (
          <div class={styles.columnsPanelRow}>
            <button
              class={styles.columnsPanelIconButton}
              type="button"
              aria-label={`Move ${column.id} up`}
              disabled={index() === 0}
              onClick={() => move(column.id, -1)}
            >
              ↑
            </button>
            <button
              class={styles.columnsPanelIconButton}
              type="button"
              aria-label={`Move ${column.id} down`}
              disabled={index() === cols().length - 1}
              onClick={() => move(column.id, 1)}
            >
              ↓
            </button>
            <span class={styles.columnsPanelName}>
              {String(column.columnDef.header)}
            </span>
            <button
              class={styles.columnsPanelIconButton}
              type="button"
              aria-label={`${column.getIsPinned() === 'left' ? 'Unpin' : 'Pin'} ${column.id}`}
              data-testid={`pin-${column.id}`}
              title={column.getIsPinned() === 'left' ? 'Unpin' : 'Pin left'}
              onClick={() => column.pin(column.getIsPinned() === 'left' ? false : 'left')}
            >
              {column.getIsPinned() === 'left' ? '📌' : '📍'}
            </button>
            <input
              type="checkbox"
              aria-label={`Show ${column.id}`}
              data-testid={`visible-${column.id}`}
              checked={column.getIsVisible()}
              onChange={column.getToggleVisibilityHandler()}
            />
          </div>
        )}
      </For>
    </div>
  );
}

const pinnedStyle = <T,>(column: TanColumn<T, unknown>): JSX.CSSProperties =>
  column.getIsPinned() === 'left' ? { left: `${column.getStart('left')}px` } : {};
