import { createEffect, createSignal, For, Match, on, Show, Switch } from 'solid-js';
import type { JSX } from 'solid-js';
import {
  createSolidTable,
  flexRender,
  functionalUpdate,
  getCoreRowModel,
  getExpandedRowModel,
  getGroupedRowModel,
  type AggregationFn,
  type Cell as TanCell,
  type Column as TanColumn,
  type ColumnDef,
  type IdentifiedColumnDef,
  type ColumnOrderState,
  type ColumnPinningState,
  type ColumnSizingState,
  type ExpandedState,
  type GroupingState,
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
  ChevronDownIcon,
  ChevronsDownIcon,
  GroupedIcon,
  MaximiseIcon,
  MinimiseIcon,
  SettingsIcon,
  TableViewIcon,
  UngroupedIcon,
} from '../../icons';
import { Popover } from '../feedback/Popover';
import { LabelledValue } from '../typography/LabelledValue';
import { ColumnSettings } from './ColumnSettings';
import { t } from '../../../intl';
import type { LocaleKey } from '../../../intl';
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
    /** Where this column renders in CARD view (viewMode 'card'). `region` 'primary' = the big
     *  top-left title, 'badge' = the top-right chip. `showLabel: true` captions the cell with a
     *  small muted label (same style as a secondary field's label) — reusing the column's own
     *  `header`, so it isn't specified twice — useful when the cell is otherwise unlabelled
     *  (e.g. an editable batch input in the primary slot). A column with NO `card` falls into
     *  the single "secondary area" below the header (a wrapping label-value flow; grouped into
     *  rows when the table is grouped — see CardView). Visibility still follows
     *  columnVisibility — a hidden column doesn't appear on the card either. */
    card?: { region: 'primary' | 'badge'; showLabel?: boolean };
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

// --- Row grouping aggregation (kdd/table-state) ---------------------------------------------
// When rows are GROUPED (see rowGroup below) a parent row stands in for its leaves, and each
// column decides what its parent cell shows via TanStack's own `aggregationFn` (set directly on
// the column — we don't wrap it). TanStack ships 'sum' etc. by name; here we export ONE extra
// custom AggregationFn a caller can hand to `aggregationFn`:
//   • sharedOrMultiple — the shared leaf value if they all agree, else the MULTIPLE sentinel.
// MULTIPLE is ONE typed, global constant so the "[multiple]" placeholder is spelled once; the
// renderer shows it literally, matching Open mSupply. The cell helpers (tableHelpers) set a
// sensible default aggregationFn (getNumberCell → 'sum').
export const MULTIPLE = '[multiple]';

// The shared-or-[multiple] aggregation: the one shared leaf value (all equal) → that value; any
// disagreement → MULTIPLE. Use EXPLICITLY on a column that should show its shared value or nothing
// (the default for text columns; dates use the date variant below). A plain TanStack AggregationFn
// — pass it straight to a column's `aggregationFn`. Typed <any> like TanStack's own built-in
// aggregation fns (their row type is invariant, so a fixed T wouldn't fit an any-T column).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const sharedOrMultiple: AggregationFn<any> = (columnId, leafRows) => {
  const first = leafRows[0]?.getValue(columnId);
  const allEqual = leafRows.every((r) => r.getValue(columnId) === first);
  return allEqual ? first : MULTIPLE;
};

// The date variant of sharedOrMultiple: compares by epoch-ms (Date.getTime) rather than the raw
// value, so equal dates in different representations (ISO string vs Date) still count as shared,
// and it's a fast numeric compare. Returns the FIRST leaf's raw value (so the column's own date
// cell still formats it) or MULTIPLE. The default for getDateCell.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const sharedOrMultipleDate: AggregationFn<any> = (columnId, leafRows) => {
  const time = (v: unknown): number | undefined => {
    if (v == null) return undefined;
    const ms = new Date(v as string | number | Date).getTime();
    return Number.isNaN(ms) ? undefined : ms;
  };
  const first = leafRows[0]?.getValue(columnId);
  const firstTime = time(first);
  const allEqual = leafRows.every((r) => time(r.getValue(columnId)) === firstTime);
  return allEqual ? first : MULTIPLE;
};

// A column that belongs to EVERY tab but is not itself part of card grouping (a row-identity
// anchor like the batch or the selection). Setting `tabsAndCardGroups: ALL_TABS` (the bare
// const, not an array) is explicit: shows in every tab (table view), and in card view falls to
// the ungrouped area (if it has no `card` region) rather than any card group's row.
export const ALL_TABS = '__all_tabs__';

// A column's tab / card-group membership as stored on the columnDef: either the ALL_TABS
// sentinel, an array of card-group keys, or absent.
type Membership = string[] | typeof ALL_TABS | undefined;

// Does a membership put the column in a given tab? ALL_TABS → yes for any tab; an array → yes
// if it lists that card group (each card group is one tab); absent → no.
const membershipInTab = (m: Membership, tab: string): boolean =>
  m === ALL_TABS ? true : Array.isArray(m) ? m.includes(tab) : false;

// The real card-group keys a membership names (excludes ALL_TABS / absent).
const membershipCardGroups = (m: Membership): string[] => (Array.isArray(m) ? m : []);

// How a column identifies itself — a discriminated union of the three real scenarios,
// replacing TanStack's raw accessorKey/accessorFn/id fields (which we strip from the base
// below, so identity is spelled EXACTLY one way per column and can be typed):
//   • `key`      — a strict `keyof T`: the column reads that field, is natively sortable,
//                  and its id is that key. Typos are a compile error. The common case.
//   • `id`       — a display column with no data accessor (an actions column, a checkbox):
//                  just a unique id, no value read.
//   • `accessor` — a computed value (a nested `row.item.code`, a derived string): an
//                  accessorFn plus an explicit `id`, since there's no key to derive one from.
// The mapper `toColumnDef` (below) turns each case into the matching TanStack fields, and
// always sets an explicit `id` — so EVERY column has a known id (no accessorKey-derivation to
// mirror), which the sort-key ⇄ id round-trip and column config rely on. This lives under the
// column's `c` field (below) as ONE nested object, so it can't get mixed up with the display
// fields (header/cell/meta) or `sortKey`.
export type ColumnIdentity<T> =
  | { key: keyof T; id?: never; accessor?: never }
  | { id: string; key?: never; accessor?: never }
  | { accessor: (row: T) => unknown; id: string; key?: never };

// Our column = a `c` field holding the identity union (nested so it never mixes with the rest)
// + the non-identity TanStack column fields (cell, header, meta, enableSorting, …) via
// IdentifiedColumnDef minus its own `id` — that interface is exactly ColumnDefBase
// (cell/meta/footer/sorting/…) PLUS `header`, and carries NONE of accessorKey/accessorFn (those
// live in TanStack's identity mixins, which we're replacing); we drop its optional `id` since
// our identity `c` owns id — then add our two extensions:
//   • `sortKey` — the GraphQL sort field, typed as a real K (kept SEPARATE from identity: a
//     column may sort by a different field than it displays, and ColumnMeta can't carry K since
//     ColumnDef only parameterises over TData/TValue). Usually equals the column's key/id; the
//     DataTable maps sortKey ⇄ resolved id for the manual-sort round-trip.
//   • `tabsAndCardGroups` — the card-group membership (a card group is presented as a TAB in
//     table view, hence the name): EITHER the ALL_TABS sentinel (bare — an anchor in every tab
//     but not a card group), OR an ARRAY of the table's card-group keys (typed G, so a typo is a
//     compile error; a column may list several). Omitting it means the column is in no card
//     group — in card view it lands in the ungrouped area. See TabAndCardGroup + the filter
//     below, and kdd/edit-line-card-table.
// Display-only conventions (align, card region) live in `meta` — kdd/table-state.
export type Column<T, K extends string, G extends string = never> = {
  /** The column's identity — one of key / id / accessor+id (see ColumnIdentity). Nested under
   *  its own field so the identity choice stays distinct from the display fields and sortKey. */
  c: ColumnIdentity<T>;
} & Omit<IdentifiedColumnDef<T>, 'id'> & {
    sortKey?: K;
    tabsAndCardGroups?: G[] | typeof ALL_TABS;
  };

// Map our Column → the TanStack ColumnDef it feeds to createSolidTable, translating the `c`
// identity into the matching TanStack fields and GUARANTEEING an explicit `id`:
//   • key      → accessorKey: key, id: String(key)
//   • accessor → accessorFn: accessor, id
//   • id       → id (a display column — no accessor)
// The rest of the column (header/cell/meta + our sortKey/tabsAndCardGroups) rides along untouched —
// read back off the columnDef by the sort mapper, the card-group filter, and ColumnSettings.
export const toColumnDef = <T, K extends string, G extends string>(
  col: Column<T, K, G>,
): ColumnDef<T> => {
  const { c, ...rest } = col;
  // `rest` already carries TanStack's own fields — including `aggregationFn`/`aggregatedCell` for
  // row grouping (from ColumnDefBase) — so a caller sets those directly; nothing to remap.
  if (c.key !== undefined) return { ...rest, accessorKey: c.key, id: String(c.key) } as ColumnDef<T>;
  if (c.accessor !== undefined) return { ...rest, accessorFn: c.accessor, id: c.id } as ColumnDef<T>;
  return { ...rest, id: c.id } as ColumnDef<T>;
};

// A card-group definition for a grouped table. The page declares a const list;
// `Column.tabsAndCardGroups` references these keys (typed as G). One shape drives both faces
// (kdd/edit-line-card-table): a card group shows as a TAB in table view and a GROUP-ROW in card
// view — hence the icon (shown on the tab + the card group row) and the translated label.
export type TabAndCardGroup<G extends string> = {
  /** The card-group key — what a column's `tabsAndCardGroups` entry must match. */
  key: G;
  /** i18n key for the card-group label (shown on its tab + card group row). */
  labelKey: LocaleKey;
  /**
   * Optional icon for the card group — its tab and its card group-row — as a FACTORY
   * (`() => <Icon/>`), not a bare element. The icon renders in multiple places at once (the tab
   * strip + one per card in card view); a shared JSX element is a single DOM node that can only
   * live in one place (it would end up on just the last card), so each render site calls this to
   * get its own node.
   */
  icon?: () => JSX.Element;
};

export type DataTableProps<T, K extends string, G extends string = never> = {
  columns: Column<T, K, G>[];
  rows: T[];
  rowKey: (row: T) => string;

  // --- Card groups (optional; kdd/edit-line-card-table). Each shows as a TAB in table view. ---
  // When `tabsAndCardGroups` is set the table shows a tab strip and only the active card group's
  // columns. "Active card group's columns" = columns whose `tabsAndCardGroups` includes the
  // active card group OR the ALL_TABS sentinel. This is a SECONDARY visibility filter baked in
  // here — it filters props.columns before they reach the table, deliberately separate from the
  // config's columnVisibility so it never touches the user's persisted column layout. The TABLE
  // owns the active card group entirely (an internal signal, defaulting to the first): the caller
  // just declares `tabsAndCardGroups`. No active-card-group state leaks to the page.
  tabsAndCardGroups?: TabAndCardGroup<G>[];

  // --- Row grouping (optional; kdd/table-state). A DIFFERENT concept from card groups: it ---
  // collapses ROWS sharing a value under one expandable parent row (e.g. all a stocktake item's
  // batches). Grouping/expansion/aggregation are TanStack's (getGroupedRowModel +
  // getExpandedRowModel + per-column aggregationFn); we render what it computes. A group with
  // only ONE leaf isn't expandable — it renders as a plain row (matches Open mSupply). Parent
  // cells show a column's aggregate (opt-in via a column's aggregationFn) or blank.
  //
  // The grouping is STATIC — the consumer names ONE column to group by (`columnId`); the toolbar
  // then shows a single folder-icon TOGGLE that turns grouping on/off. The on/off state is table
  // CONFIG (config.groupBy = columnId when on, absent when off), so it persists + layers + is
  // per-band exactly like viewMode — the page doesn't own it.
  rowGroup?: {
    /** The column id to group by when grouping is on. */
    columnId: string;
    /** i18n key for the toggle's label/tooltip (e.g. "Group by item"). */
    labelKey: LocaleKey;
  };
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
  /** Show the full-screen toggle in the control bar. Default true. Pass false where full
   *  screen makes no sense — e.g. a table inside a modal (the shell it would toggle isn't the
   *  host). The card-switch + column-settings controls are unaffected. */
  showFullScreen?: boolean;

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

export function DataTable<T, K extends string, G extends string = never>(
  props: DataTableProps<T, K, G>,
): JSX.Element {
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

  // --- Selection ⇄ the page's selectedIds (controlled, like sort/config) ---
  // We store ONLY real leaf-row ids — never a group's synthetic id. rowSelection is derived from
  // props.selectedIds; a change is resolved against it and reported back, group ids stripped. A
  // GROUP row's checkbox is NOT wired to its own selected state (see the checkbox below) — it's
  // driven by getIsAllSubRowsSelected() and toggles its leaves directly, so it never depends on a
  // stored group id. This sidesteps TanStack's grouped-selection desync (issue #4349): selecting
  // a group, deselecting one leaf (group now unchecked), then clicking the group again cleanly
  // re-selects ALL its leaves.
  const rowSelection = (): RowSelectionState =>
    Object.fromEntries((props.selectedIds ?? []).map((id) => [id, true]));
  const onRowSelectionChange = (u: Updater<RowSelectionState>) => {
    const next = functionalUpdate(u, rowSelection());
    const rowsById = table.getCoreRowModel().rowsById;
    const ids = Object.keys(next).filter(
      (id) => next[id] && rowsById[id] && !rowsById[id].getIsGrouped(),
    );
    props.onSelectionChange?.(ids);
  };
  // Toggle a GROUP row's leaves in ONE emit (not per-leaf toggleSelected, which would fire N
  // changes each computed against the same stale selection and clobber the others). If not all of
  // the group's leaves are selected → add them all; else remove them all.
  const toggleGroupSelection = (row: TanRow<T>) => {
    const leafIds = row.getLeafRows().map((leaf) => leaf.id);
    const current = new Set(props.selectedIds ?? []);
    const selectAll = !row.getIsAllSubRowsSelected();
    if (selectAll) leafIds.forEach((id) => current.add(id));
    else leafIds.forEach((id) => current.delete(id));
    props.onSelectionChange?.([...current]);
  };

  // --- Column config ⇄ the page's resolved config (order/sizing/pinning/visibility) ---
  // Each field mirrors props.config into TanStack state, with TanStack's own empty default
  // (an absent field means "TanStack decides" — declaration order, all visible, etc.). Each
  // on*Change resolves TanStack's updater against the current value (same as sort/selection
  // above) and hands the concrete value to setConfig — so the page receives a value, not an
  // updater. Inlined per field (no generic helper) — four small, click-through handlers.
  const columnOrder = (): ColumnOrderState => props.config?.columnOrder ?? [];
  const columnPinning = (): ColumnPinningState => props.config?.columnPinning ?? {};
  const columnVisibility = (): VisibilityState => props.config?.columnVisibility ?? {};

  // View mode is a config field but NOT a TanStack state (no on*Change) — read it directly.
  // Defaults to 'table' when unset. The toolbar switcher writes it via setConfig per band.
  const viewMode = (): ViewMode => props.config?.viewMode ?? 'table';

  // --- Row grouping state (kdd/table-state) ---
  // `grouping` mirrors config.groupBy (table CONFIG, like viewMode) into TanStack's GroupingState
  // (a single id, or empty when ungrouped). Expansion is the TABLE's own concern (which parents
  // are open), so it's an internal signal — like the active tab. Changing the grouped column
  // resets expansion (via the effect below) so stale expanded ids don't linger.
  const groupBy = (): string | undefined => props.config?.groupBy;
  const grouping = (): GroupingState => (groupBy() ? [groupBy() as string] : []);
  const [expanded, setExpanded] = createSignal<ExpandedState>({});
  createEffect(on(groupBy, () => setExpanded({})));

  // Column sizing crosses a unit boundary: config/appData stores REM (so widths scale with
  // the root font-size like the rest of the UI — see utils/rem), but TanStack works in PX.
  // So the state getter converts the stored rem → px, and commits convert px → rem.
  //
  // Live resize (columnResizeMode 'onChange') would otherwise persist on every drag tick.
  // Instead a TRANSIENT px signal overlays config DURING an active drag: onColumnSizingChange
  // writes it (keeps the column moving live, no persistence), and an effect commits px→rem
  // via setConfig once the drag ends, then clears it. Non-drag changes (the size input in
  // ColumnSettings) come through setConfig directly and persist immediately.
  const [transientSizing, setTransientSizing] = createSignal<ColumnSizingState | null>(null);
  const configSizingPx = (): ColumnSizingState => {
    const rem = props.config?.columnSizing ?? {};
    return Object.fromEntries(Object.entries(rem).map(([id, r]) => [id, remToPx(r)]));
  };
  const pxToRemSizing = (px: ColumnSizingState): ColumnSizingState =>
    Object.fromEntries(Object.entries(px).map(([id, p]) => [id, pxToRem(p)]));
  const columnSizing = (): ColumnSizingState => transientSizing() ?? configSizingPx();

  // --- Card groups: the SECONDARY visibility filter (kdd/edit-line-card-table). Each card ---
  // group is a TAB in table view. The table OWNS the active card group (an internal signal).
  // `activeTab()` resolves to the selected card group when it's still one of the declared
  // ones, else falls back to the first (covers the initial render + a card-group list that
  // changed). Undefined when the table has no card groups.
  const [selectedTab, setSelectedTab] = createSignal<G>();
  const activeTab = (): G | undefined => {
    const cardGroups = props.tabsAndCardGroups;
    if (!cardGroups || cardGroups.length === 0) return undefined;
    const selected = selectedTab();
    return selected && cardGroups.some((g) => g.key === selected) ? selected : cardGroups[0].key;
  };
  // Card-group membership is a DISPLAY-TIME filter, NOT a column filter: TanStack always holds
  // the FULL column set, so config/column-settings/order/visibility operate on every column
  // consistently (hiding a shared column is unambiguously global — see kdd/table-state). We
  // instead skip rendering the header/body cells of columns not in the active card group, in the
  // table-view render below. `columnInActiveTab` is the predicate: a column shows in the
  // active card group (tab) when its `tabsAndCardGroups` includes it OR the ALL_TABS sentinel;
  // when the table has no card groups every column shows.
  const columnInActiveTab = (col: { tabsAndCardGroups?: Membership } | undefined): boolean => {
    const cardGroup = activeTab();
    if (!props.tabsAndCardGroups || cardGroup === undefined) return true;
    return membershipInTab(col?.tabsAndCardGroups, cardGroup);
  };
  // The visible-in-active-card-group leaf columns (drives header/body render + empty-row colSpan).
  const visibleTabColumns = () =>
    table
      .getVisibleLeafColumns()
      .filter((c) => columnInActiveTab(c.columnDef as { tabsAndCardGroups?: Membership }));

  const table = createSolidTable<T>({
    get data() {
      return props.rows;
    },
    get columns() {
      // Our Column carries a typed identity union + extension fields; map each to the raw
      // TanStack ColumnDef (identity → accessorKey/accessorFn/id, always an explicit id).
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
      get grouping() {
        return grouping();
      },
      get expanded() {
        return expanded();
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
    onColumnOrderChange: (u) => props.setConfig?.('columnOrder', functionalUpdate(u, columnOrder())),
    // Sizing (px): during a live resize drag, park it in the transient signal (moves the
    // column, no persistence); the effect below commits px→rem on drag end. Any other
    // sizing change (the ColumnSettings size input) persists immediately as rem.
    onColumnSizingChange: (u) => {
      const nextPx = functionalUpdate(u, columnSizing());
      if (table.getState().columnSizingInfo.isResizingColumn) {
        setTransientSizing(nextPx);
      } else {
        props.setConfig?.('columnSizing', pxToRemSizing(nextPx));
      }
    },
    onColumnPinningChange: (u) => props.setConfig?.('columnPinning', functionalUpdate(u, columnPinning())),
    onColumnVisibilityChange: (u) =>
      props.setConfig?.('columnVisibility', functionalUpdate(u, columnVisibility())),
    // Row grouping: grouping is driven by the page (rowGroup.by) so it has no onGroupingChange —
    // the Select writes rowGroup.onByChange directly. Expansion is table-owned. A group with a
    // single leaf isn't expandable — it renders as a plain row (matches Open mSupply). The
    // grouped column is NOT pulled into its own column (groupedColumnMode false) — the grouped
    // value shows in that column's own cell on the parent row.
    onExpandedChange: (u) => setExpanded(functionalUpdate(u, expanded())),
    getRowCanExpand: (row) => row.getLeafRows().length > 1,
    groupedColumnMode: false,
    // We control expansion (state.expanded) — TanStack's auto-reset (default ON) would otherwise
    // clear it on every row-model recompute, so a click's expand is undone on the next render.
    autoResetExpanded: false,
    getRowId: (row) => props.rowKey(row),
    getCoreRowModel: getCoreRowModel(),
    getGroupedRowModel: getGroupedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
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
    }),
  );

  // Count only the columns rendered in the active card group (+ the selection column + the
  // expander column when grouped), so the empty-state row's colSpan matches the actual cell count.
  const leafColumnCount = () =>
    visibleTabColumns().length + (props.enableSelection ? 1 : 0) + (grouping().length > 0 ? 1 : 0);

  // --- Expand ALL groups (the header double-chevron) ---
  // TanStack's getToggleAllRowsExpandedHandler would also expand SINGLE-leaf groups (which can't
  // really expand — they'd "expand to self"), so we drive expansion ourselves: the EXPANDABLE
  // group rows only (getRowCanExpand, i.e. >1 leaf). "All expanded" = every expandable group is
  // open; toggling collapses all (→ {}) or opens exactly those.
  const expandableGroupRows = () =>
    table.getGroupedRowModel().rows.filter((row) => row.getCanExpand());
  const allGroupsExpanded = () => {
    const groups = expandableGroupRows();
    return groups.length > 0 && groups.every((row) => row.getIsExpanded());
  };
  const toggleAllGroups = () => {
    if (allGroupsExpanded()) {
      setExpanded({});
    } else {
      setExpanded(Object.fromEntries(expandableGroupRows().map((row) => [row.id, true])));
    }
  };

  // --- Column pinning: freeze a pinned column against the left/right edge on horizontal scroll ---
  // TanStack tracks WHICH columns are pinned (columnPinning state, set via ColumnSettings); it's
  // on us to make them sticky. For a cell we compute position:sticky + the inline-start/end offset
  // = the summed widths of the pinned columns before (left) / after (right) it, plus the leading
  // fixed columns (selection + expander) for left offsets. Returns undefined for an unpinned cell.
  //
  // The leading select/expander columns are 2.25rem each (see .selectCell/.expanderCell) and are
  // themselves pinned-left (they must not scroll away either) — LEADING_WIDTH is their total.
  const LEADING_COL_PX = 36; // 2.25rem at the 16px root
  const leadingWidth = () =>
    (props.enableSelection ? LEADING_COL_PX : 0) + (grouping().length > 0 ? LEADING_COL_PX : 0);

  // The sticky style for a data column's cell (header or body), or undefined when unpinned. Only
  // position + edge offset — z-index (the header-over-body / pinned-over-scrolling stacking) is
  // owned entirely by CSS (.td[data-pinned] vs .th[data-pinned]), so the SAME style is safe on a
  // header or a body cell without an inline z-index overriding the CSS layer.
  //
  // The edge offset is TanStack's own getStart('left') / getAfter('right') — the summed widths of
  // the pinned columns before (left) / after (right) THIS one, on that side. Both index the column
  // by its id (not object identity), so a cell-context column resolves correctly against the
  // table's column list — the earlier indexOf(column) matched by reference and missed, summing the
  // column's own width so a single right-pinned column floated one column-width off the edge. Left
  // offsets add leadingWidth() for the (also-pinned) leading select/expander columns.
  const pinnedStyle = (column: TanColumn<T>): JSX.CSSProperties | undefined => {
    const side = column.getIsPinned();
    if (!side) return undefined;
    if (side === 'left') {
      return { position: 'sticky', left: `${leadingWidth() + column.getStart('left')}px` };
    }
    return { position: 'sticky', right: `${column.getAfter('right')}px` };
  };

  // The leading select/expander columns are pinned-left too (offset 0 for the first, one column
  // width for the second) so they stay frozen alongside any left-pinned data columns. z-index is
  // CSS-owned (see pinnedStyle).
  const leadingPinnedStyle = (index: number): JSX.CSSProperties => ({
    position: 'sticky',
    left: `${index * LEADING_COL_PX}px`,
  });

  // Inside a shell, full-screen is handled by hiding shell/page chrome — the table stays
  // in normal flow so its footer (pagination/selection) stays visible below it. Only the
  // standalone fallback (no shell, e.g. showcase) needs the table's own fixed overlay.
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
          <div class={styles.groupTabs} role="tablist" aria-label={t('table.card-groups')}>
            <For each={props.tabsAndCardGroups}>
              {(cardGroup) => (
                <button
                  type="button"
                  role="tab"
                  class={styles.groupTab}
                  data-active={cardGroup.key === activeTab() ? '' : undefined}
                  aria-selected={cardGroup.key === activeTab()}
                  onClick={() => setSelectedTab(() => cardGroup.key)}
                >
                  <Show when={cardGroup.icon}>
                    {(icon) => <span class={styles.groupTabIcon}>{icon()()}</span>}
                  </Show>
                  {/* icon()() — Show's accessor yields the factory (cardGroup.icon); the 2nd call renders it. */}
                  {t(cardGroup.labelKey)}
                </button>
              )}
            </For>
          </div>
        </Show>
        {/* Group-by toggle — a single folder-icon button that turns the STATIC grouping (the
            consumer's rowGroup.columnId) on/off. Only in table view (grouping is a table-view
            concept) and when config + rowGroup are wired (the on/off state is config.groupBy —
            persisted/layered like viewMode). The icon shows the ACTION the click performs: the
            stacked-folders "ungroup" icon while grouped, the single-folder "group" icon while
            ungrouped. */}
        <Show when={props.rowGroup && props.setConfig && viewMode() === 'table'}>
          <button
            type="button"
            class={`${styles.controlButton} ${grouping().length ? styles.controlButtonActive : ''}`}
            aria-pressed={grouping().length > 0}
            aria-label={t(props.rowGroup!.labelKey)}
            title={t(props.rowGroup!.labelKey)}
            data-testid="table-group-toggle"
            onClick={() =>
              props.setConfig?.('groupBy', groupBy() ? undefined : props.rowGroup!.columnId)
            }
          >
            <Show when={grouping().length} fallback={<GroupedIcon />}>
              <UngroupedIcon />
            </Show>
          </button>
        </Show>
        {/* View-mode switcher — shows the OTHER mode's icon (in table view, the card icon
            to switch to cards, and vice versa). Writes viewMode for the current band via
            setConfig, so it persists + is per-breakpoint. Only when config is wired. */}
        <Show when={props.setConfig}>
          <button
            type="button"
            class={styles.controlButton}
            aria-label={viewMode() === 'card' ? t('table.view-table') : t('table.view-cards')}
            title={viewMode() === 'card' ? t('table.view-table') : t('table.view-cards')}
            data-testid="table-view-switch"
            onClick={() => props.setConfig?.('viewMode', viewMode() === 'card' ? 'table' : 'card')}
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
            title={t('table.full-screen')}
            onClick={() => setFullScreen(!fullScreen())}
          >
            {fullScreen() ? <MinimiseIcon /> : <MaximiseIcon />}
          </button>
        </Show>
      </div>
      <div class={styles.tableScroll}>
        <Switch>
          <Match when={viewMode() === 'card'}>
            <CardView
              table={table}
              tabsAndCardGroups={props.tabsAndCardGroups}
              enableSelection={props.enableSelection ?? false}
              onRowClick={props.onRowClick}
              emptyMessage={props.emptyMessage}
            />
          </Match>
          <Match when={viewMode() === 'table'}>
            <table class={styles.table}>
              <thead>
                <For each={table.getHeaderGroups()}>
                  {(headerGroup) => (
                    <tr>
                      {/* Expander column header — the "expand/collapse ALL" double-chevron (Open
                          mSupply), reserving the chevron column when the table is grouped. */}
                      <Show when={grouping().length > 0}>
                        <th
                          class={`${styles.th} ${styles.expanderCell}`}
                          data-pinned="left"
                          style={leadingPinnedStyle(0)}
                        >
                          <button
                            type="button"
                            class={styles.groupExpander}
                            data-expanded={allGroupsExpanded() ? '' : undefined}
                            aria-expanded={allGroupsExpanded()}
                            aria-label={
                              allGroupsExpanded()
                                ? t('table.collapse-all-groups')
                                : t('table.expand-all-groups')
                            }
                            data-testid="table-expand-all"
                            onClick={toggleAllGroups}
                          >
                            <ChevronsDownIcon />
                          </button>
                        </th>
                      </Show>
                      <Show when={props.enableSelection}>
                        <th
                          class={`${styles.th} ${styles.selectCell}`}
                          data-pinned="left"
                          style={leadingPinnedStyle(grouping().length > 0 ? 1 : 0)}
                        >
                          <input
                            type="checkbox"
                            aria-label={t('table.select-all')}
                            data-testid="select-all"
                            checked={table.getIsAllRowsSelected()}
                            onChange={table.getToggleAllRowsSelectedHandler()}
                          />
                        </th>
                      </Show>
                      {/* Display-time tab filter: render only the active tab's header cells
                          (TanStack still holds every column — see columnInActiveTab). */}
                      <For each={headerGroup.headers}>
                        {(header) => (
                          <Show
                            when={columnInActiveTab(
                              header.column.columnDef as { tabsAndCardGroups?: Membership },
                            )}
                          >
                            <HeaderCell header={header} pinnedStyle={pinnedStyle} />
                          </Show>
                        )}
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
                        showExpander={grouping().length > 0}
                        onRowClick={props.onRowClick}
                        onToggleGroup={toggleGroupSelection}
                        pinnedStyle={pinnedStyle}
                        leadingPinnedStyle={leadingPinnedStyle}
                        cellVisible={(cell) =>
                          columnInActiveTab(cell.column.columnDef as { tabsAndCardGroups?: Membership })
                        }
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
const cellAlign = <T,>(cell: TanCell<T, unknown>): 'left' | 'right' | 'center' | undefined =>
  cell.column.columnDef.meta?.align;

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
  /** When grouped, a leading expander column is present; parent (expandable) rows show a chevron. */
  showExpander: boolean;
  onRowClick?: (row: T) => void;
  /** Select/deselect ALL of a group row's leaves in one emit (called for a grouped-row checkbox). */
  onToggleGroup: (row: TanRow<T>) => void;
  /** Sticky-pin style for a pinned data column's cell (position/offset/z-index), else undefined. */
  pinnedStyle: (column: TanColumn<T>) => JSX.CSSProperties | undefined;
  /** Sticky-pin style for a leading (expander/select) cell at the given index (always pinned left). */
  leadingPinnedStyle: (index: number) => JSX.CSSProperties;
  /** Display-time tab filter: render a cell only when this returns true (see columnInActiveTab). */
  cellVisible: (cell: TanCell<T, unknown>) => boolean;
}): JSX.Element {
  return (
    <tr
      data-testid="table-row"
      class={props.onRowClick ? styles.rowClickable : undefined}
      // Selected rows get the same brand tint as selected cards (consistent selection signal
      // across both views); styled on the cells (data-selected) in CSS. A GROUP row shows the
      // tint when ALL its leaves are selected — mirroring its checkbox (its own id isn't stored,
      // so getIsSelected() would stay false).
      data-selected={
        (props.row.getIsGrouped() ? props.row.getIsAllSubRowsSelected() : props.row.getIsSelected())
          ? ''
          : undefined
      }
      onClick={() => props.onRowClick?.(props.row.original)}
    >
      {/* Expander column (row grouping): its OWN leading column — the chevron on an expandable
          parent, blank otherwise (matches Open mSupply, which puts the chevrons before select). */}
      <Show when={props.showExpander}>
        <td class={styles.expanderCell} data-pinned="left" style={props.leadingPinnedStyle(0)}>
          <Show when={props.row.getCanExpand()}>
            <button
              type="button"
              class={styles.groupExpander}
              data-expanded={props.row.getIsExpanded() ? '' : undefined}
              aria-expanded={props.row.getIsExpanded()}
              aria-label={props.row.getIsExpanded() ? t('table.collapse-group') : t('table.expand-group')}
              onClick={(event) => {
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
            onClick={(event) => event.stopPropagation()}
          />
        </td>
      </Show>
      <For each={props.row.getVisibleCells()}>
        {(cell) => (
          <Show when={props.cellVisible(cell)}>
            <td
              class={styles.td}
              data-align={cellAlign(cell)}
              data-pinned={cell.column.getIsPinned() || undefined}
              // data-wrap + --wrap-lines: when a column sets meta.wrapLines > 1, the cell
              // clamps to that many lines then ellipsises (CSS line-clamp); otherwise the
              // default single-line nowrap applies. min-width keeps the column-width floor.
              // A pinned column additionally gets sticky position + its edge offset.
              data-wrap={cellWrapLines(cell) ? '' : undefined}
              style={{
                'min-width': `${cell.column.getSize()}px`,
                ...(cellWrapLines(cell) ? { '--wrap-lines': String(cellWrapLines(cell)) } : {}),
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

// A cell's explicit card region, or undefined when it has none — in which case it belongs to
// the single "secondary area" (rendered below the header, ordered by group when grouped).
const cellCardRegion = <T,>(cell: TanCell<T, unknown>): 'primary' | 'badge' | undefined =>
  cell.column.columnDef.meta?.card?.region;

// The column's header text, for a field label. Headers may be a string or JSX/function; only
// the string case yields a readable label (our columns use strings), else no label.
const columnHeaderText = <T,>(cell: TanCell<T, unknown>): string | undefined => {
  const header = cell.column.columnDef.header;
  return typeof header === 'string' ? header : undefined;
};

// The optional caption for a primary/badge card cell — a small muted label above the cell (for
// an otherwise-unlabelled cell, e.g. an editable input). Opt in with `card.showLabel`; the text
// is the column's own header, so it isn't specified twice.
const cellCardLabel = <T,>(cell: TanCell<T, unknown>): string | undefined =>
  cell.column.columnDef.meta?.card?.showLabel ? columnHeaderText(cell) : undefined;

// A cell's column membership (ALL_TABS sentinel | array of group keys | undefined).
const cellMembership = <T,>(cell: TanCell<T, unknown>): Membership =>
  (cell.column.columnDef as { tabsAndCardGroups?: Membership }).tabsAndCardGroups;

// Whether a cell belongs to a real card GROUP (a declared group key) — excludes ALL_TABS, which
// appears in every tab but is NOT part of card grouping.
const cellInGroup = <T,>(cell: TanCell<T, unknown>, key: string): boolean =>
  membershipCardGroups(cellMembership(cell)).includes(key);

// Card view — each row is a card (ui-standards § tables): primary identity top-left, a badge
// top-right, and the rest in the secondary area below. Reuses TanStack's row model + visible
// cells, routing each by its meta.card region; selection + row-click mirror the table. When
// `tabsAndCardGroups` is set (kdd/edit-line-card-table), the secondary area is ordered by group —
// each group as its own ROW (icon + its fields); ALL_TABS / ungrouped cells follow, unlabelled.
function CardView<T>(props: {
  table: import('@tanstack/solid-table').Table<T>;
  tabsAndCardGroups?: TabAndCardGroup<string>[];
  enableSelection: boolean;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
}): JSX.Element {
  const rows = () => props.table.getRowModel().rows;
  return (
    <Show
      when={rows().length > 0}
      fallback={<div class={styles.cardEmpty}>{props.emptyMessage ?? t('table.no-results')}</div>}
    >
      <div class={styles.cardGrid}>
        <For each={rows()}>
          {(row) => {
            const cells = () => row.getVisibleCells();
            const inRegion = (region: 'primary' | 'badge') =>
              cells().filter((c) => cellCardRegion(c) === region);
            // The "secondary area": every visible cell with NO explicit card region.
            const secondaryCells = () => cells().filter((c) => cellCardRegion(c) === undefined);
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
                      onClick={(event) => event.stopPropagation()}
                    />
                  </Show>
                  <div class={styles.cardIdentity}>
                    <For each={inRegion('primary')}>
                      {(cell) => (
                        // meta.card.label (optional): a muted caption above the cell, same style
                        // as a secondary field's label — for an unlabelled cell (e.g. an input).
                        <LabelledValue label={cellCardLabel(cell)}>
                          <div class={styles.cardPrimary}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </div>
                        </LabelledValue>
                      )}
                    </For>
                  </div>
                  <For each={inRegion('badge')}>
                    {(cell) => (
                      <LabelledValue label={cellCardLabel(cell)}>
                        <div class={styles.cardBadge}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </div>
                      </LabelledValue>
                    )}
                  </For>
                </div>
                {/* The secondary area — every cell with no explicit card region. When grouped:
                    each group is its own ROW (a .cardFields flow led by the group ICON),
                    skipping groups with nothing visible (pass 1); then a final row for cells in
                    NO group — ALL_TABS anchors + un-annotated columns — with no icon (pass 2).
                    Ungrouped tables render one flat row. A cell is "in a group" only via a real
                    tab key; ALL_TABS never counts as a card group. */}
                <Show when={secondaryCells().length > 0}>
                  {/* Pass 1 — one row per group. */}
                  <For each={props.tabsAndCardGroups}>
                    {(group) => {
                      const groupCells = () =>
                        secondaryCells().filter((c) => cellInGroup(c, group.key));
                      return (
                        <Show when={groupCells().length > 0}>
                          <div class={styles.cardFields}>
                            <Show when={group.icon}>
                              {(icon) => <span class={styles.cardGroupIcon}>{icon()()}</span>}
                            </Show>
                            <For each={groupCells()}>
                              {(cell) => (
                                <LabelledValue label={columnHeaderText(cell)}>
                                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                </LabelledValue>
                              )}
                            </For>
                          </div>
                        </Show>
                      );
                    }}
                  </For>
                  {/* Pass 2 — the ungrouped row: cells in no real group (ALL_TABS anchors +
                      un-annotated), and the whole set when the table isn't grouped. No icon. */}
                  <Show
                    when={secondaryCells().filter(
                      (c) => !(props.tabsAndCardGroups ?? []).some((g) => cellInGroup(c, g.key)),
                    )}
                  >
                    {(ungrouped) => (
                      <Show when={ungrouped().length > 0}>
                        <div class={styles.cardFields}>
                          <For each={ungrouped()}>
                            {(cell) => (
                              <LabelledValue label={columnHeaderText(cell)}>
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                              </LabelledValue>
                            )}
                          </For>
                        </div>
                      </Show>
                    )}
                  </Show>
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
  /** Sticky-pin style for a pinned column (position/left/right/z-index), else undefined. */
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
    return <span class={styles.sortIndicator}>{sorted === 'desc' ? '▼' : '▲'}</span>;
  };
  return (
    <th
      class={styles.th}
      data-align={align()}
      data-pinned={column().getIsPinned() || undefined}
      data-testid={canSort() ? `column-${column().id}` : undefined}
      // Auto table layout (columns flex to fill); getSize() is applied as a min-width FLOOR,
      // so a configured size / a resize drag widens the column without losing the auto-fill.
      // A pinned column additionally gets sticky position + its edge offset.
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
          onClick={(event) => event.stopPropagation()}
          aria-hidden="true"
        />
      </Show>
    </th>
  );
}
