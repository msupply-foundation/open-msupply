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
import {
  CONFIG_KEYS,
  type TableConfig,
  type TableConfigKey,
  type ViewMode,
} from './tableConfig';
import { pxToRem, remToPx } from '../../utils/rem';
import { useIsNavOverlay } from '../../utils/createMediaQuery';
import { useFullScreen } from '../../layout/AppShell/shellContext';
import {
  CloseIcon,
  ColumnsIcon,
  MaximiseIcon,
  MinimiseIcon,
  SettingsIcon,
} from '../../icons';
import { Popover } from '../feedback/Popover';
import { BareCheckbox } from '../inputs/BareCheckbox';
import { EmptyState } from '../feedback/EmptyState';
import { Spinner } from '../feedback/Spinner';
import { Button } from '../buttons/Button';
import { ContentFooter } from '../../layout/ContentFooter/ContentFooter';
import { ContentFooterActions } from '../../layout/ContentFooter/ContentFooterActions';
import { ColumnSettings } from './ColumnSettings';
import { TableSettings } from './TableSettings';
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
// toggle comes back via onSort); selection and filter state are the page's
// too. Pagination STATE stays page-owned (offset/pageSize/total in the URL).
// What changed with the ui-standards § tables reconciliation is WHERE the
// chrome renders: the table is now the composition root of its own chrome —
// the TOOLBAR (the page-composed filter bar inline-start + the control cluster
// inline-end) and the FOOTER (one bar: the pager by default, swapping to the
// selection action bar while rows are selected) both live inside the table,
// not in the page Header / the Page frame's contentFooter. The page still owns
// every piece of state and composes the variable content (`filters`,
// `selectionActions`); the table owns only the arrangement, the generic
// selection count + Clear, and full screen.
//
// Header interactions: clicking a sortable header sorts. The toolbar controls:
// the Columns popover (show/move/pin/width per column), the Settings popover
// (reset-to-default, save-as-global-default), and full screen.

export type DataTableProps<T, K extends string, G extends string = never> = {
  columns: Column<T, K, G>[];
  rows: T[];
  rowKey: (row: T) => string;

  /**
   * The page-composed filter bar (a <FilterBar …/>), rendered inline-start in
   * the table's toolbar — filters live WITH the table, not the page header
   * (ui-standards § tables → filtering). Filter state stays page-owned
   * (URL-backed); this is a pure render slot.
   */
  filters?: JSX.Element;

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
   * Semantic row state (ui-standards § tables row states), derived by the
   * page from the record's own facts — 'disabled' from the vertical's
   * editability gate (read-only records, e.g. SHIPPED+ shipments),
   * 'verified'/'warning' only where the domain has such a fact. One state
   * per row, never stacked. Unselected rows stay WHITE — the badge alone
   * carries the state; 'verified'/'warning' tint only while the row is
   * SELECTED, replacing the selection blue (Carl 2026-07-24, confirmed
   * against the spec demo's behaviour). 'disabled' is the exception:
   * grey fill + muted text always. Every tint restates a fact a badge in
   * the row already shows (never colour alone). Stamps data-row-state on
   * the row, styled in CSS.
   */
  rowState?: (row: T) => 'verified' | 'warning' | 'disabled' | undefined;
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
  /**
   * The page's bulk actions for the selection action bar (gated buttons —
   * Delete, Duplicate, …). While rows are selected, the table's footer swaps
   * from the pager to "N selected" + these + Clear (ui-standards § tables →
   * pagination: one footer bar shared by pagination and the selection zone;
   * OMS swaps the whole bar). Explicit page-composed JSX
   * (kdd/explicit-composition) — the table adds only the generic count +
   * Clear. Omit while a page still renders its own selection footer (the
   * pre-reconciliation composition): the table's footer then always shows the
   * pager.
   */
  selectionActions?: JSX.Element;

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
  // Settings popover. The HOST owns the gate (central server +
  // EDIT_CENTRAL_DATA — kept out of this generic table): pass the callback only
  // when the current user may save, omit it otherwise and the action isn't
  // offered. Resolves true on success / false on failure (the panel reflects it
  // inline).
  onSaveGlobalDefault?: () => Promise<boolean>;
  /**
   * The table's layout currently equals its default (no user-layer
   * overrides) — disables the Settings popover's "Reset table to default"
   * (visible but disabled at default, ui-standards § tables → column
   * management). Supplied by the page's config controller (createTableConfig's
   * isConfigDefault, which owns the layers — the table only sees the resolved
   * config, so it can't derive this itself). Omit and Reset stays enabled (a
   * no-op reset at default is harmless).
   */
  configIsDefault?: boolean;

  // --- Pagination (optional), STATE owned by the page. --- When set, the
  // table's footer bar shows the Pagination control (its default face — the
  // selection action bar replaces it while rows are selected, see
  // `selectionActions`). The page still owns offset/pageSize/total (URL-backed,
  // kdd/url-structure) and this table is pure presentation over them — it does
  // not page rows itself (manual, server-driven; see kdd/table-state). Omit for
  // a non-paginated table.
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

  // The footer's selection face shows while rows are selected AND the page has
  // supplied its bulk actions — a page still rendering its own selection footer
  // (not yet migrated to `selectionActions`) keeps the pager face, so the two
  // footers never double up.
  const selectedCount = () => props.selectedIds?.length ?? 0;
  const selectionBarActive = () =>
    props.selectionActions !== undefined && selectedCount() > 0;

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
  // it directly. Defaults to 'table' when unset; the compact band's config
  // default typically flips it to 'card'.
  const viewMode = (): ViewMode => props.config?.viewMode ?? 'table';

  // Row density (ui-standards § tables → row heights) — a view-level config
  // field like viewMode, chosen in the Settings popover and stamped as
  // data-density on the <table> (row heights + cell padding mapped in CSS).
  // Comfortable is the spec's ⭐ default on desktop; below the nav-overlay
  // width the DEFAULT grows to spacious (ui-standards § tables → responsive;
  // Carl 2026-07-24: keyed to the existing breakpoint, not the spec's 1280
  // band). An explicit user choice (config) wins at any width; Reset clears
  // it and the responsive default resumes.
  const isNarrow = useIsNavOverlay();
  const viewDensity = () =>
    props.config?.viewDensity ?? (isNarrow() ? 'spacious' : 'comfortable');

  // Reset the table to its default layout (the Settings popover's ONE reset —
  // ui-standards § tables → column management): clear every user-layer
  // override for the current band by writing `undefined` through setConfig, so
  // resolution falls through to the global/default layers (and appData prunes
  // the emptied user entry). NOT TanStack's reset* — those write TanStack's
  // own empty initialState INTO the user layer, which would shadow the page's
  // default layer (e.g. its start-hidden columns) instead of revealing it.
  const resetConfig = () => {
    for (const key of CONFIG_KEYS) props.setConfig?.(key, undefined);
  };

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
  // --table-leading-col (3rem, on the table .root — see DataTable.module.css);
  // we mirror the same rem here via remToPx (reads the live root font-size, so
  // it tracks the compact-band 85% root too). leadingWidth is its total.
  const leadingColPx = () => remToPx(3); // keep 3 in sync with --table-leading-col
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
      {/* The table toolbar (ui-standards § tables): one bar above the scroll
          area — the page-composed filter bar inline-start, the control cluster
          inline-end. Outside the scroll region, so it never scrolls with the
          table content and doesn't collide with the scroll box's rounded
          border. */}
      <div class={styles.toolbar}>
        {/* Filter bar slot — the page's <FilterBar>, living WITH the table
            (ui-standards § tables → filtering), not in the page header. Pure
            placement: filter state stays page-owned. */}
        <Show when={props.filters}>
          <div class={styles.toolbarFilters}>{props.filters}</div>
        </Show>
        {/* Card-group tabs (inline-start, after any filters). Only in table view — card view
            shows the card groups as rows. A lightweight role=tablist (buttons): swapping the
            active card group is a secondary column filter on ONE table, not a panel swap, so
            no Kobalte Tabs. */}
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
        {/* The control cluster — the toolbar's icon controls, held at the
            inline-end by its own auto margin. */}
        <div class={styles.toolbarControls}>
          {/* Loading indicator — a small inline spinner just to the LEFT of the
              icon controls while a fetch runs AND rows are already showing (a
              refetch on filter/sort/page — keepPreviousData keeps the rows
              put). Signals "updating" without blanking or remounting the table
              (#160/#196). Initial load (no rows yet) uses the centred spinner
              below instead, so the two never show together. */}
          <Show when={props.loading && table.getRowModel().rows.length > 0}>
            <span class={styles.toolbarLoading}>
              <Spinner sizeRem={1.1} data-testid="table-loading-inline" />
            </span>
          </Show>
          {/* NO manual table/card view switch here (the spec's toolbar is
              exactly three controls: Columns, Settings, full-screen). viewMode
              still works — the compact band's config default flips to card view
              — and the switch button returns with the card-view pass (Phase 3). */}
          {/* Columns — the per-column panel (show / move / pin;
              ui-standards § tables → column management: one predictable place,
              headers stay clean). Only when the page wired config controls
              (setConfig present); otherwise there's nothing to configure. */}
          <Show when={props.setConfig}>
            <Popover
              placement="bottom-end"
              trigger={<ColumnsIcon />}
              triggerLabel={t('table.columns')}
              triggerClass={styles.controlButton}
            >
              <ColumnSettings
                table={table}
                setConfig={props.setConfig}
                tabsAndCardGroups={props.tabsAndCardGroups}
              />
            </Popover>
          </Show>
          {/* Settings — table-wide settings (the Density radio, Reset table to
              default, save-as-global-default), split from the per-column panel
              per the spec's two-control toolbar. */}
          <Show when={props.setConfig}>
            <Popover
              placement="bottom-end"
              trigger={<SettingsIcon />}
              triggerLabel={t('table.settings')}
              triggerClass={styles.controlButton}
            >
              <TableSettings
                config={props.config}
                density={viewDensity()}
                setConfig={props.setConfig}
                onReset={resetConfig}
                resetDisabled={props.configIsDefault}
                onSaveGlobalDefault={props.onSaveGlobalDefault}
              />
            </Popover>
          </Show>
          {/* Full-screen — a shell-level mode (hides menu/footer). Not every host can host it
              (e.g. a table inside a modal), so a caller opts out with showFullScreen={false};
              the card-switch + columns/settings controls above still render. */}
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
      {/* tableArea fills the remaining height between the toolbar and the
          footer bar, so the scroll box inside it is full-height even for a
          short list. */}
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
          <table class={styles.table} data-density={viewDensity()}>
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
                          {/* Partial selection (some rows on this page, not
                              all) shows the indeterminate dash (ui-standards
                              § tables → row selection). */}
                          <BareCheckbox
                            class={styles.selectBox}
                            aria-label={t('table.select-all')}
                            data-testid="select-all-rows-checkbox"
                            checked={table.getIsAllRowsSelected()}
                            indeterminate={table.getIsSomeRowsSelected()}
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
                          rowState={props.rowState}
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
      </div>
      {/* TableFooter — ONE footer bar owned by the table (ui-standards §
          tables → pagination: pagination and the selection zone share a single
          footer pinned to the bottom of the table area; nothing floats over
          the rows). Reuses the ContentFooter layout bar, a flex-shrink:0 child
          of the table's column, below the scroll box — so it never scrolls
          away and the last data row is never covered. Two faces, swapped
          whole (the OMS idiom):
            default        → the pager (when `pagination` is passed);
            rows selected  → "N selected" + the page's gated bulk actions
                             (`selectionActions`) + Clear.
          State stays page-owned (kdd/table-state) — only the controls render
          here. Pages not yet migrated (no selectionActions) keep their own
          Page-level selection footer and this bar just shows the pager. */}
      <Show when={props.pagination || selectionBarActive()}>
        <ContentFooter
          class={styles.tableFooter}
          testId={selectionBarActive() ? 'actions-footer' : 'table-footer'}
        >
          <Show
            when={selectionBarActive()}
            fallback={
              <Show when={props.pagination}>
                {/* Spread the LIVE prop object (not a <Show>-accessor
                    snapshot): the page recreates props.pagination whenever
                    offset/total change, and a JSX spread of props.pagination
                    stays reactive so Pagination sees the new offset/total. A
                    `{...accessor()}` snapshot would freeze the pager on its
                    first values (offset never advances). */}
                <Pagination {...props.pagination!} />
              </Show>
            }
          >
            <strong data-testid="selected-rows-count">
              {selectedCount()} {t('label.selected')}
            </strong>
            {props.selectionActions}
            <ContentFooterActions>
              <Button
                variant="secondary"
                icon={<CloseIcon />}
                onClick={() => props.onSelectionChange?.([])}
              >
                {t('label.clear-selection')}
              </Button>
            </ContentFooterActions>
          </Show>
        </ContentFooter>
      </Show>
    </div>
  );
}
