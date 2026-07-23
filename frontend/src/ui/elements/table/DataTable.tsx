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
  type Column as TanColumn,
  type ColumnOrderState,
  type ColumnPinningState,
  type ColumnSizingState,
  type RowSelectionState,
  type SortingState,
  type Updater,
  type VisibilityState,
} from '@tanstack/solid-table';
import { sortKeyToId, sortIdToKey } from './tableHelpers';
import {
  membershipInTab,
  toColumnDef,
  type Column,
  type Membership,
  type SortState,
  type TabAndCardGroup,
} from './columnTypes';
import { HeaderCell } from './HeaderCell';
import { TableRow } from './TableRow';
import { CardView } from './CardView';
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
import { EmptyState } from '../feedback/EmptyState';
import { Spinner } from '../feedback/Spinner';
import { ColumnSettings } from './ColumnSettings';
import { Pagination, type PaginationProps } from './Pagination';
import { t } from '../../../intl';
import styles from './DataTable.module.css';

// The column model
// (Column/ColumnIdentity/toColumnDef/TabAndCardGroup/ALL_TABS/SortState + the
// ColumnMeta augmentation) lives in columnTypes.ts, re-exported here so
// consumers keep importing from './DataTable'. The three render paths
// (HeaderCell / TableRow / CardView) are their own files. What remains in THIS
// file is the stateful table controller.
export type {
  Column,
  ColumnIdentity,
  SortState,
  TabAndCardGroup,
} from './columnTypes';
export { ALL_TABS, toColumnDef } from './columnTypes';

// Generic, server-driven data table shared across list pages
// (kdd/explicit-composition treats the data table as its sanctioned
// config-driven exception: N columns × M rows is genuinely tabular, unlike a
// form). Built on TanStack Table; we route as much state handling through it as
// it genuinely owns and extend it type-safely — see kdd/table-state (meta for
// untyped flags like align; a typed field on Column<T,K> for typed ones like
// sortKey; pagination + sort/selection state stay page-owned). The component is
// presentational about *data* — it does not fetch, paginate, or sort rows
// itself; the page hands in the current page of rows already in the order it
// wants (see `manualSorting`).
//
// Ownership: the URL owns sort (the page hands in pre-ordered rows and the
// toggle comes back via onSort); selection is the page's too (it renders the
// selection action bar in its own contextual footer). Pagination STATE stays
// page-owned (offset/pageSize/total in the URL), but its CONTROL now renders
// INSIDE the table — pinned bottom-inline-end, overlaid on the scroll area with
// a trailing spacer row so the last data row clears it (pass `pagination`).
// Full screen is the only state the DataTable owns.
//
// Header interactions: clicking a sortable header sorts. The toolbar has one
// control: full screen.

export type DataTableProps<T, K extends string, G extends string = never> = {
  columns: Column<T, K, G>[];
  rows: T[];
  rowKey: (row: T) => string;

  // --- Card groups (optional; kdd/edit-line-card-table). Each shows as a TAB
  // in table view. --- When `tabsAndCardGroups` is set the table shows a tab
  // strip and only the active card group's columns. "Active card group's
  // columns" = columns whose `tabsAndCardGroups` includes the active card group
  // OR the ALL_TABS sentinel. This is a SECONDARY visibility filter baked in
  // here — it filters props.columns before they reach the table, deliberately
  // separate from the config's columnVisibility so it never touches the user's
  // persisted column layout. The TABLE owns the active card group entirely (an
  // internal signal, defaulting to the first): the caller just declares
  // `tabsAndCardGroups`. No active-card-group state leaks to the page.
  tabsAndCardGroups?: TabAndCardGroup<G>[];

  /** Current sort, or undefined when unsorted. */
  sort?: SortState<K>;
  /**
   * Header click for a sortable column. TanStack computes the next direction
   * (the
   *  asc → desc cycle); the page just records key + desc — e.g. into URL sort
   *  state.
   */
  onSort?: (key: K, desc: boolean) => void;
  /**
   * When set, a row is clickable and calls this — e.g. navigate, or open an
   * edit
   *  modal. Rows get a pointer cursor only when this is set. */
  onRowClick?: (row: T) => void;
  /**
   * De-emphasise matching rows (read-only records, e.g. SHIPPED+ shipments —
   * ui-standards/list-views): stamps data-dimmed on the row, styled in CSS.
   */
  rowDimmed?: (row: T) => boolean;
  /**
   * Semantic text tone for matching rows: 'info' for lines awaiting an action
   * (placeholder / uncounted lines), 'error' for a line the server refused (a
   * failed bulk operation). Stamps data-tone on the row, mapped to palette
   * tokens in CSS. Semantic names only, never colours.
   */
  rowTone?: (row: T) => 'info' | 'error' | undefined;
  /**
   * The data is being fetched. Drives the loading treatment so a slow fetch
   * never flashes the empty state (issues #160/#196): with NO rows yet
   * (initial load) a centred spinner replaces the empty state; with rows
   * already showing (a refetch on filter/sort/page — kept via
   * keepPreviousData) the rows stay put and a small spinner appears in the
   * toolbar (inline-start). Pass the resource's `.loading` (a non-suspending
   * read — do NOT wrap a refetching list in Suspense, which would remount the
   * table; see kdd/solid-reactivity-pitfalls).
   */
  loading?: boolean;
  /** Message shown (as the empty-state body) when there are no rows. */
  emptyMessage?: string;
  /**
   * Optional call-to-action rendered BELOW the empty message (inside the
   * "nothing here" empty state), e.g. a "New stocktake" / "Add item" button.
   * Shown in both table and card views when there are no rows.
   */
  empty?: JSX.Element;
  /**
   * Show the full-screen toggle in the control bar. Default true. Pass false
   * where full
   *  screen makes no sense — e.g. a table inside a modal (the shell it would
   *  toggle isn't the host). The card-switch + column-settings controls are
   *  unaffected.
   */
  showFullScreen?: boolean;

  // --- Row selection, owned by the page. ---
  enableSelection?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;

  // --- Column config (order/sizing/pinning/visibility), owned by the page. ---
  // Controlled exactly like sort/selection (kdd/table-state): the page
  // resolves the layers (default → global → user) into ONE `config` (see
  // createTableConfig) and this table mirrors it into TanStack state; a
  // column-state change calls setConfig with the RESOLVED next value for that
  // one field (this table applies TanStack's functional updater against the
  // current config first — see below — so the page just receives a value, like
  // onSort). Both optional — omit them and the table just uses TanStack's own
  // defaults from `columns`.
  config?: TableConfig;
  setConfig?: <K extends TableConfigKey>(key: K, value: TableConfig[K]) => void;
  // Save the current layout as the shared install-wide default, surfaced in the
  // column-settings panel. The HOST owns the gate (central server +
  // EDIT_CENTRAL_DATA — kept out of this generic table): pass the callback only
  // when the current user may save, omit it otherwise and the action isn't
  // offered. Resolves true on success / false on failure (the panel reflects it
  // inline).
  onSaveGlobalDefault?: () => Promise<boolean>;

  // --- Pagination (optional), STATE owned by the page. --- When set, the table
  // renders the Pagination control pinned bottom-inline-end, overlaid on the
  // scroll area (a trailing spacer row keeps the last data row readable beneath
  // it). The page still owns offset/pageSize/total (URL-backed, kdd/url-structure)
  // and this table is pure presentation over them — it does not page rows itself
  // (manual, server-driven; see kdd/table-state). Omit for a non-paginated table.
  pagination?: PaginationProps;
};

export function DataTable<T, K extends string, G extends string = never>(
  props: DataTableProps<T, K, G>
): JSX.Element {
  // Full screen is a shell-level mode (menu bar, app footer and page header
  // all hide, so the table + its footer fill the viewport — see AppShell/Page).
  // The button just flips the shared shell flag. Outside a shell (e.g. the
  // component showcase) there's no provider, so fall back to a local signal —
  // the button still toggles, table-scoped.
  const shellFullScreen = useFullScreen();
  const [localFullScreen, setLocalFullScreen] = createSignal(false);
  const fullScreen = () => shellFullScreen?.isFullScreen() ?? localFullScreen();
  const setFullScreen = (value: boolean) =>
    shellFullScreen
      ? shellFullScreen.setFullScreen(value)
      : setLocalFullScreen(value);

  // --- Sort (manual: the page provides ordered rows and owns the sort state)
  // --- Controlled: the SortingState mirrors the page's props.sort, and a
  // header click notifies the page via onSort. The page speaks sortKey (the
  // GraphQL field) while TanStack keys SortingState by the resolved column id —
  // sortKeyToId / sortIdToKey map between them (see tableHelpers.ts).
  //
  // functionalUpdate is TanStack's own helper: onSortingChange is called with
  // an updater that may be a value OR a fn(old => next), so we apply it against
  // the current sorting() to read the concrete next state. TanStack has already
  // computed the next direction, so we pass its desc straight through rather
  // than re-deriving the asc/desc cycle.
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

  // --- Selection ⇄ the page's selectedIds (controlled, like sort/config) ---
  // rowSelection is derived from props.selectedIds; a change is resolved
  // against it and reported back.
  const rowSelection = (): RowSelectionState =>
    Object.fromEntries((props.selectedIds ?? []).map(id => [id, true]));
  const onRowSelectionChange = (u: Updater<RowSelectionState>) => {
    const next = functionalUpdate(u, rowSelection());
    const ids = Object.keys(next).filter(id => next[id]);
    props.onSelectionChange?.(ids);
  };

  // --- Column config ⇄ the page's resolved config
  // (order/sizing/pinning/visibility) --- Each field mirrors props.config into
  // TanStack state, with TanStack's own empty default (an absent field means
  // "TanStack decides" — declaration order, all visible, etc.). Each on*Change
  // resolves TanStack's updater against the current value (same as
  // sort/selection above) and hands the concrete value to setConfig — so the
  // page receives a value, not an updater. Inlined per field (no generic
  // helper) — four small, click-through handlers.
  const columnOrder = (): ColumnOrderState => props.config?.columnOrder ?? [];
  const columnPinning = (): ColumnPinningState =>
    props.config?.columnPinning ?? {};
  const columnVisibility = (): VisibilityState =>
    props.config?.columnVisibility ?? {};

  // View mode is a config field but NOT a TanStack state (no on*Change) — read
  // it directly. Defaults to 'table' when unset. The toolbar switcher writes it
  // via setConfig per band.
  const viewMode = (): ViewMode => props.config?.viewMode ?? 'table';

  // Column sizing crosses a unit boundary: config/appData stores REM (so
  // widths scale with the root font-size like the rest of the UI — see
  // utils/rem), but TanStack works in PX. So the state getter converts the
  // stored rem → px, and commits convert px → rem.
  //
  // Live resize (columnResizeMode 'onChange') would otherwise persist on every
  // drag tick. Instead a TRANSIENT px signal overlays config DURING an active
  // drag: onColumnSizingChange writes it (keeps the column moving live, no
  // persistence), and an effect commits px→rem via setConfig once the drag
  // ends, then clears it. Non-drag changes (the size input in ColumnSettings)
  // come through setConfig directly and persist immediately.
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

  // --- Card groups: the SECONDARY visibility filter
  // (kdd/edit-line-card-table). Each card --- group is a TAB in table view. The
  // table OWNS the active card group (an internal signal). `activeTab()`
  // resolves to the selected card group when it's still one of the declared
  // ones, else falls back to the first (covers the initial render + a
  // card-group list that changed). Undefined when the table has no card groups.
  const [selectedTab, setSelectedTab] = createSignal<G>();
  const activeTab = (): G | undefined => {
    const cardGroups = props.tabsAndCardGroups;
    if (!cardGroups || cardGroups.length === 0) return undefined;
    const selected = selectedTab();
    return selected && cardGroups.some(g => g.key === selected)
      ? selected
      : cardGroups[0].key;
  };
  // Card-group membership is a DISPLAY-TIME filter, NOT a column filter:
  // TanStack always holds the FULL column set, so
  // config/column-settings/order/visibility operate on every column
  // consistently (hiding a shared column is unambiguously global — see
  // kdd/table-state). We instead skip rendering the header/body cells of
  // columns not in the active card group, in the table-view render below.
  // `columnInActiveTab` is the predicate: a column shows in the active card
  // group (tab) when its `tabsAndCardGroups` includes it OR the ALL_TABS
  // sentinel; when the table has no card groups every column shows.
  const columnInActiveTab = (
    col: { tabsAndCardGroups?: Membership } | undefined
  ): boolean => {
    const cardGroup = activeTab();
    if (!props.tabsAndCardGroups || cardGroup === undefined) return true;
    return membershipInTab(col?.tabsAndCardGroups, cardGroup);
  };

  // Does any active-tab column declare a `footer`? Drives whether the footer
  // band renders at all — a table with no summed columns has no <tfoot>.
  const hasFooter = (): boolean =>
    props.columns.some(
      col => col.footer !== undefined && columnInActiveTab(col)
    );
  const table = createSolidTable<T>({
    get data() {
      return props.rows;
    },
    get columns() {
      // Our Column carries a typed identity union + extension fields; map each
      // to the raw TanStack ColumnDef (identity → accessorKey/accessorFn/id,
      // always an explicit id).
      return props.columns.map(toColumnDef);
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
    // Sizing (px): during a live resize drag, park it in the transient signal
    // (moves the column, no persistence); the effect below commits px→rem on
    // drag end. Any other sizing change (the ColumnSettings size input)
    // persists immediately as rem.
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

  // Commit a live resize once the drag ends: when isResizingColumn clears and
  // we hold a transient px sizing, convert it to rem, persist via setConfig,
  // and drop the transient (config, now updated, takes over as the source).
  // Guarded by `on` so it only fires on the resizing-state transition, not on
  // unrelated reactivity.
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

  // --- Column pinning: freeze a pinned column against the left/right edge on
  // horizontal scroll --- TanStack tracks WHICH columns are pinned
  // (columnPinning state, set via ColumnSettings); it's on us to make them
  // sticky. For a cell we compute position:sticky + the inline-start/end offset
  // = the summed widths of the pinned columns before (left) / after (right) it,
  // plus the leading fixed selection column for left offsets.
  // Returns undefined for an unpinned cell.
  //
  // The leading selection column is a FIXED box (see .selectCell — hard min/max
  // so content can't widen it) and is itself pinned-left (it must not scroll
  // away either). This px MUST equal that box width, or the first data column
  // scrolls through a seam beside it. The width's ONE source is
  // --table-leading-col (2.75rem, on the table .root — see DataTable.module.css);
  // we mirror the same rem here via remToPx (reads the live root font-size, so
  // it tracks the compact-band 85% root too). leadingWidth is its total.
  const leadingColPx = () => remToPx(2.75); // keep 2.75 in sync with --table-leading-col
  const leadingWidth = () => (props.enableSelection ? leadingColPx() : 0);

  // The sticky style for a data column's cell (header or body), or undefined
  // when unpinned. Only position + edge offset — z-index (the header-over-body
  // / pinned-over-scrolling stacking) is owned entirely by CSS
  // (.td[data-pinned] vs .th[data-pinned]), so the SAME style is safe on a
  // header or a body cell without an inline z-index overriding the CSS layer.
  //
  // The edge offset is TanStack's own getStart('left') / getAfter('right') —
  // the summed widths of the pinned columns before (left) / after (right) THIS
  // one, on that side. Both index the column by its id (not object identity),
  // so a cell-context column resolves correctly against the table's column list
  // — the earlier indexOf(column) matched by reference and missed, summing the
  // column's own width so a single right-pinned column floated one column-width
  // off the edge. Left offsets add leadingWidth() for the (also-pinned) leading
  // select/expander columns.
  const pinnedStyle = (column: TanColumn<T>): JSX.CSSProperties | undefined => {
    const side = column.getIsPinned();
    if (!side) return undefined;
    if (side === 'left') {
      return {
        position: 'sticky',
        left: `${leadingWidth() + column.getStart('left')}px`,
      };
    }
    return { position: 'sticky', right: `${column.getAfter('right')}px` };
  };

  // The leading selection column is pinned-left too (offset 0) so it stays
  // frozen alongside any left-pinned data columns. z-index is CSS-owned (see
  // pinnedStyle).
  const leadingPinnedStyle = (index: number): JSX.CSSProperties => ({
    position: 'sticky',
    left: `${index * leadingColPx()}px`,
  });

  // Inside a shell, full-screen is handled by hiding shell/page chrome — the
  // table stays in normal flow so its footer (pagination/selection) stays
  // visible below it. Only the standalone fallback (no shell, e.g. showcase)
  // needs the table's own fixed overlay.
  const overlay = () => fullScreen() && !shellFullScreen;

  return (
    <div class={`${styles.root} ${overlay() ? styles.fullScreen : ''}`}>
      {/* Toolbar sits ABOVE the scroll area (not inside it), so it never scrolls with the
          table content and doesn't collide with the scroll region's rounded border. */}
      <div class={styles.toolbar}>
        {/* Card-group tabs live in the control bar (inline-start), pushing the icon controls to
            the inline-end via their own auto margin. Only in table view — card view shows the
            card groups as rows. A lightweight role=tablist (buttons): swapping the active card
            group is a secondary column filter on ONE table, not a panel swap, so no Kobalte Tabs. */}
        <Show when={props.tabsAndCardGroups && viewMode() === 'table'}>
          <div
            class={styles.groupTabs}
            role="tablist"
            aria-label={t('table.card-groups')}
          >
            <For each={props.tabsAndCardGroups}>
              {cardGroup => (
                <button
                  type="button"
                  role="tab"
                  class={styles.groupTab}
                  // tab-<key> per e2e/TESTIDS.md — the group key is the
                  // locale-stable value (the label is translated).
                  data-testid={`tab-${cardGroup.key}`}
                  data-active={cardGroup.key === activeTab() ? '' : undefined}
                  aria-selected={cardGroup.key === activeTab()}
                  onClick={() => setSelectedTab(() => cardGroup.key)}
                >
                  <Show when={cardGroup.icon}>
                    {icon => (
                      <span class={styles.groupTabIcon}>{icon()()}</span>
                    )}
                  </Show>
                  {/* icon()() — Show's accessor yields the factory (cardGroup.icon); the 2nd call renders it. */}
                  {t(cardGroup.labelKey)}
                </button>
              )}
            </For>
          </div>
        </Show>
        {/* Loading indicator — a small inline spinner sitting just to the LEFT of
            the toolbar's icon controls (the toolbar is flex-end, so it clusters
            with them at the inline-end) while a fetch runs AND rows are already
            showing (a refetch on filter/sort/page — keepPreviousData keeps the
            rows put). Signals "updating" without blanking or remounting the table
            (#160/#196). Initial load (no rows yet) uses the centred spinner below
            instead, so the two never show together. */}
        <Show when={props.loading && table.getRowModel().rows.length > 0}>
          <span class={styles.toolbarLoading}>
            <Spinner sizeRem={1.1} data-testid="table-loading-inline" />
          </span>
        </Show>
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
              tabsAndCardGroups={props.tabsAndCardGroups}
              onSaveGlobalDefault={props.onSaveGlobalDefault}
            />
          </Popover>
        </Show>
        {/* Full-screen — a shell-level mode (hides menu/footer). Not every host can host it
            (e.g. a table inside a modal), so a caller opts out with showFullScreen={false};
            the card-switch + column-settings controls above still render. */}
        <Show when={props.showFullScreen !== false}>
          <button
            type="button"
            class={`${styles.fullScreenButton} ${fullScreen() ? styles.controlButtonActive : ''}`}
            aria-label={t('table.toggle-full-screen')}
            data-testid="table-fullscreen"
            title={t('label.full-screen')}
            onClick={() => setFullScreen(!fullScreen())}
          >
            {fullScreen() ? <MinimiseIcon /> : <MaximiseIcon />}
          </button>
        </Show>
      </div>
      {/* Refreshing bar — a thin indeterminate progress bar pinned above the
          scroll area while a fetch runs AND rows are already showing (a refetch
          on filter/sort/page — keepPreviousData keeps the old rows in place). It
          signals "updating" without blanking the table or remounting it (issue
          #160/#196). The initial load (no rows yet) uses the centred spinner
          below instead, so the two never show together. */}
      <Show when={props.loading && table.getRowModel().rows.length > 0}>
        <div
          class={styles.refreshingBar}
          role="status"
          aria-label={t('loading')}
        />
      </Show>
      {/* tableArea is the positioning context for the pagination overlay: the
          overlay is a SIBLING of the scroll box (not inside it), absolutely
          pinned to this box's bottom-inline-end — so it sits at the very bottom
          of the visible table regardless of how short the list is, and never
          scrolls away with the content. */}
      <div class={styles.tableArea}>
        <div
          class={styles.tableScroll}
          data-empty={table.getRowModel().rows.length === 0 ? '' : undefined}
        >
          {/* One <table> for BOTH views — card view is now rows in the SAME
              table (each card is a full-width <tr>), so columns/scroll/selection
              are shared. The header row is table-view only (hidden in card view:
              a card's fields carry their own labels via LabelledValue). The table
              renders even with NO rows so the column headers stay visible — the
              empty state / spinner sits BELOW it (matching the current app). */}
          <table class={styles.table}>
            <Show when={viewMode() === 'table'}>
              <thead>
                <For each={table.getHeaderGroups()}>
                  {headerGroup => (
                    <tr>
                      <Show when={props.enableSelection}>
                        <th
                          class={`${styles.th} ${styles.selectCell}`}
                          data-pinned="left"
                          style={leadingPinnedStyle(0)}
                        >
                          <input
                            type="checkbox"
                            aria-label={t('table.select-all')}
                            data-testid="select-all-rows-checkbox"
                            checked={table.getIsAllRowsSelected()}
                            onChange={table.getToggleAllRowsSelectedHandler()}
                          />
                        </th>
                      </Show>
                      {/* Display-time tab filter: render only the active tab's header cells
                          (TanStack still holds every column — see columnInActiveTab). */}
                      <For each={headerGroup.headers}>
                        {header => (
                          <Show
                            when={columnInActiveTab(
                              header.column.columnDef as {
                                tabsAndCardGroups?: Membership;
                              }
                            )}
                          >
                            <HeaderCell
                              header={header}
                              pinnedStyle={pinnedStyle}
                            />
                          </Show>
                        )}
                      </For>
                    </tr>
                  )}
                </For>
              </thead>
            </Show>
            <tbody>
              {/* Rows only when populated; the empty/loading state renders
                  below the table so the headers stay visible. Table view → one
                  <TableRow> per row; card view → one full-width card <tr> per row
                  (CardView), so both live in the same <table>. */}
              <Show when={table.getRowModel().rows.length > 0}>
                <Switch>
                  <Match when={viewMode() === 'card'}>
                    <CardView
                      table={table}
                      tabsAndCardGroups={props.tabsAndCardGroups}
                      enableSelection={props.enableSelection ?? false}
                      onRowClick={props.onRowClick}
                    />
                  </Match>
                  <Match when={viewMode() === 'table'}>
                    <For each={table.getRowModel().rows}>
                      {row => (
                        <TableRow
                          row={row}
                          enableSelection={props.enableSelection ?? false}
                          onRowClick={props.onRowClick}
                          rowDimmed={props.rowDimmed}
                          rowTone={props.rowTone}
                          pinnedStyle={pinnedStyle}
                          leadingPinnedStyle={leadingPinnedStyle}
                          cellVisible={cell =>
                            columnInActiveTab(
                              cell.column.columnDef as {
                                tabsAndCardGroups?: Membership;
                              }
                            )
                          }
                        />
                      )}
                    </For>
                  </Match>
                </Switch>
                {/* Trailing spacer row — reserves height equal to the pagination
                  overlay so the last data row can scroll fully into view above it
                  (the overlay is pinned over the bottom-inline-end of the scroll
                  area). Only when paginated. Presentational, not selectable. */}
                <Show when={props.pagination}>
                  <tr aria-hidden="true" class={styles.paginationSpacerRow}>
                    <td />
                  </tr>
                </Show>
              </Show>
            </tbody>
            {/* Footer band (table view only) — rendered iff a column declares
                  a `footer` (e.g. a summed total, see the inbound Financial
                  tab). Mirrors the header row's structure: a leading blank cell
                  under the selection column, then one cell per active-tab
                  column carrying its own align. The `footer` render fn owns the
                  content (a string, or flexRender of a component). */}
            <Show
              when={
                viewMode() === 'table' &&
                hasFooter() &&
                table.getRowModel().rows.length > 0
              }
            >
              <tfoot>
                <For each={table.getFooterGroups()}>
                  {footerGroup => (
                    <tr>
                      <Show when={props.enableSelection}>
                        <td
                          class={`${styles.tf} ${styles.selectCell}`}
                          aria-hidden="true"
                        />
                      </Show>
                      <For each={footerGroup.headers}>
                        {header => (
                          <Show
                            when={columnInActiveTab(
                              header.column.columnDef as {
                                tabsAndCardGroups?: Membership;
                              }
                            )}
                          >
                            <td
                              class={styles.tf}
                              data-align={header.column.columnDef.meta?.align}
                              data-testid={`footer-${header.column.id}`}
                            >
                              {flexRender(
                                header.column.columnDef.footer,
                                header.getContext()
                              )}
                            </td>
                          </Show>
                        )}
                      </For>
                    </tr>
                  )}
                </For>
              </tfoot>
            </Show>
          </table>
          {/* Empty / initial-loading state — a sibling BELOW the table so the
                column headers above stay visible (matching the current app). The
                bordered box is dropped while empty (data-empty on tableScroll).
                Loading with no rows shows the spinner; a settled empty list shows
                the "nothing here" empty state. */}
          <Show when={table.getRowModel().rows.length === 0}>
            <div class={styles.emptyBody}>
              <Show
                when={props.loading}
                fallback={
                  <EmptyState
                    data-testid="nothing-here"
                    message={props.emptyMessage ?? t('table.no-results')}
                  >
                    {props.empty}
                  </EmptyState>
                }
              >
                <Spinner center data-testid="table-loading" />
              </Show>
            </div>
          </Show>
        </div>
        {/* Pagination overlay — absolutely pinned to the bottom-inline-end of
            the table AREA (a sibling of the scroll box, not inside it), so it
            sits at the very bottom-right of the visible table for ANY list size
            (short lists included) and never scrolls away. The trailing spacer
            row inside the scroll keeps the last data row readable beneath it
            (kdd/table-state: state stays page-owned; only the control renders
            here). */}
        <Show when={props.pagination}>
          <div class={styles.paginationOverlay}>
            {/* Spread the LIVE prop object (not a <Show>-accessor snapshot): the
                page recreates props.pagination whenever offset/total change, and
                a JSX spread of props.pagination stays reactive so Pagination sees
                the new offset/total. A `{...accessor()}` snapshot would freeze the
                pager on its first values (offset never advances). */}
            <Pagination {...props.pagination!} />
          </div>
        </Show>
      </div>
    </div>
  );
}
