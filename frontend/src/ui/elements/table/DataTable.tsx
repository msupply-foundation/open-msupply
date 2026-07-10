import { createSignal, For, Show } from 'solid-js';
import type { JSX } from 'solid-js';
import {
  createSolidTable,
  flexRender,
  functionalUpdate,
  getCoreRowModel,
  type Cell as TanCell,
  type ColumnDef,
  type Row as TanRow,
  type RowData,
  type RowSelectionState,
  type SortingState,
  type Updater,
} from '@tanstack/solid-table';
import { sortKeyToId, sortIdToKey } from './tableHelpers';
import { useFullScreen } from '../../layout/AppShell/shellContext';
import { MaximiseIcon, MinimiseIcon } from '../../icons';
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
};

export function DataTable<T, K extends string>(props: DataTableProps<T, K>): JSX.Element {
  // Full screen is a shell-level mode (menu bar, app footer and page header all hide, so
  // the table + its footer fill the viewport — see AppShell/Page). The button just flips
  // the shared shell flag. Outside a shell (e.g. the component showcase) there's no
  // provider, so fall back to a local signal — the button still toggles, table-scoped.
  const shellFullScreen = useFullScreen();
  const [localFullScreen, setLocalFullScreen] = createSignal(false);
  const fullScreen = () => shellFullScreen?.isFullScreen() ?? localFullScreen();
  const setFullScreen = (value: boolean) =>
    shellFullScreen ? shellFullScreen.setFullScreen(value) : setLocalFullScreen(value);

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
    props.sort ? [{ id: sortKeyToId(props.columns, props.sort.key), desc: props.sort.desc }] : [];
  const onSortingChange = (updater: Updater<SortingState>) => {
    const sort = functionalUpdate(updater, sorting())[0];
    if (!sort) return;
    const key = sortIdToKey(props.columns, sort.id);
    if (key) props.onSort?.(key, sort.desc);
  };

  // --- Selection ⇄ the page's selectedIds ---
  const rowSelection = (): RowSelectionState =>
    Object.fromEntries((props.selectedIds ?? []).map((id) => [id, true]));
  const onRowSelectionChange = (u: Updater<RowSelectionState>) => {
    const next = functionalUpdate(u, rowSelection());
    props.onSelectionChange?.(Object.keys(next).filter((id) => next[id]));
  };

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
    },
    manualSorting: true,
    enableSortingRemoval: false,
    get enableRowSelection() {
      return props.enableSelection ?? false;
    },
    onSortingChange,
    onRowSelectionChange,
    getRowId: (row) => props.rowKey(row),
    getCoreRowModel: getCoreRowModel(),
  });

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
        <table class={styles.table}>
          <thead>
            <For each={table.getHeaderGroups()}>
              {(headerGroup) => (
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
                    {(header) => <HeaderCell header={header} />}
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
                {(row) => (
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
    </div>
  );
}

// The alignment convention carried on a column's meta (set by the cell helpers).
const cellAlign = <T,>(cell: TanCell<T, unknown>): 'left' | 'right' | 'center' | undefined =>
  cell.column.columnDef.meta?.align;

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
      onClick={() => props.onRowClick?.(props.row.original)}
    >
      <Show when={props.enableSelection}>
        <td class={styles.selectCell}>
          <input
            type="checkbox"
            aria-label={t('table.select-row')}
            checked={props.row.getIsSelected()}
            onChange={props.row.getToggleSelectedHandler()}
            onClick={(event) => event.stopPropagation()}
          />
        </td>
      </Show>
      <For each={props.row.getVisibleCells()}>
        {(cell) => (
          <td class={styles.td} data-align={cellAlign(cell)}>
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </td>
        )}
      </For>
    </tr>
  );
}

// A header cell: a sortable label. No per-column menu, no resize.
function HeaderCell<T>(props: {
  header: import('@tanstack/solid-table').Header<T, unknown>;
}): JSX.Element {
  const column = () => props.header.column;
  const canSort = () => column().getCanSort();
  const align = () => column().columnDef.meta?.align;
  const indicator = () => {
    const sorted = column().getIsSorted();
    if (!sorted) return null;
    return <span class={styles.sortIndicator}>{sorted === 'desc' ? '▼' : '▲'}</span>;
  };
  return (
    <th class={styles.th} data-align={align()} data-testid={canSort() ? `column-${column().id}` : undefined}>
      <span
        class={`${styles.thLabel} ${canSort() ? styles.thSortable : ''}`}
        onClick={canSort() ? column().getToggleSortingHandler() : undefined}
      >
        {flexRender(column().columnDef.header, props.header.getContext())}
        {indicator()}
      </span>
    </th>
  );
}
