import {
  children,
  createEffect,
  createMemo,
  createSignal,
  For,
  Match,
  on,
  onCleanup,
  onMount,
  Show,
  Switch,
} from 'solid-js';
import type { JSX } from 'solid-js';
import { Portal } from 'solid-js/web';
import {
  createSolidTable,
  functionalUpdate,
  getCoreRowModel,
  type Column as TanColumn,
  type ColumnOrderState,
  type ColumnPinningState,
  type ColumnSizingState,
  type HeaderContext,
  type RowSelectionState,
  type SortingState,
  type Updater,
  type VisibilityState,
} from '@tanstack/solid-table';
import { sortKeyToId, sortIdToKey } from './tableHelpers';
import { renderTemplate } from './renderTemplate';
import { hiddenEdges } from './scrollEdges';
import {
  toColumnDef,
  type CardGroup,
  type Column,
  type SortState,
} from './columnTypes';
import { HeaderCell } from './HeaderCell';
import { TableRow } from './TableRow';
import { InTableCellContext } from './inTableCell';
import { CardView } from './CardView';
import {
  CONFIG_KEYS,
  type TableConfig,
  type TableConfigKey,
  type ViewMode,
} from './tableConfig';
import { pxToRem, remToPx } from '../../utils/rem';
import { useIsNavOverlay, useIsCompact } from '../../utils/createMediaQuery';
import { useFullScreen } from '../../layout/AppShell/shellContext';
import {
  CardViewIcon,
  CloseIcon,
  Columns3CogIcon,
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
import { paginationState } from './paginationState';
import { isRtl, t, tPlural } from '../../../intl';
import styles from './DataTable.module.css';

// The column model
// (Column/ColumnIdentity/toColumnDef/CardGroup/SortState + the ColumnMeta
// augmentation) lives in columnTypes.ts, re-exported here so consumers keep
// importing from './DataTable'. The three render paths (HeaderCell / TableRow /
// CardView) are their own files. What remains in THIS file is the stateful
// table controller.
export type {
  CardGroup,
  Column,
  ColumnIdentity,
  SortState,
} from './columnTypes';
export { toColumnDef } from './columnTypes';

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

  // --- Card groups (optional). How the CARD body is organised: each column's
  // `cardGroup` names a group, and this list declares each group's presentation
  // — icon, panel, disclosure (see CardGroup + CardView). Card-view only; table
  // view ignores it (a page wanting tabbed column subsets renders a table per
  // tab itself). Ungrouped columns form the default group. Omit for a plain
  // (single flat group) card.
  cardGroups?: CardGroup<T, G>[];
  /**
   * Offer the card ⇄ table view toggle in the toolbar (above the compact
   * breakpoint only — below it the table is always card, so no toggle). The
   * chosen view persists via `viewMode` config. Default false: a table with no
   * meaningful card layout stays table-only. Needs `setConfig` to persist.
   */
  showCardToggle?: boolean;

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
   * (placeholder / uncounted lines), 'warning' for a line needing attention
   * before it can proceed (a held batch on an outbound line), 'error' for a
   * line in an error state (expired stock; a server-refused bulk line).
   * Stamps data-tone on the row, mapped to palette tokens in CSS: table view
   * paints the whole row's text, card view the card's identity title plus,
   * for warning/error, a tinted border + faint shadow. Semantic names only,
   * never colours — and never colour alone: the tone restates a fact some
   * cell already states in words.
   */
  rowTone?: (row: T) => 'info' | 'warning' | 'error' | undefined;
  /**
   * Card-only tone override: when set, CARD view takes its tone (the tinted
   * identity title) from this instead of rowTone, and rowTone is free to
   * stay unset — for a page whose table view must NOT colour row text
   * (outbound's status-tinted tables, D111) but whose cards keep the tone
   * treatment. Same vocabulary and CSS as rowTone's card half.
   */
  cardTone?: (row: T) => 'info' | 'warning' | 'error' | undefined;
  /**
   * Semantic record-STATUS background tint, always on (unlike the rowState
   * tints, which show only while selected): 'success' for a satisfied row
   * (an outbound line with stock allocated), 'error' for an error-state row
   * (expired stock), 'warning' for a row needing attention (a held batch).
   * One tint per row — the page encodes its own precedence. Table view only
   * (cards carry status via cardTone + badges); stamps data-tint on the row,
   * mapped to palette tokens in CSS; selection deepens the tint. Never
   * colour alone: the tint restates a fact a cell states in words
   * (spec D111).
   */
  rowTint?: (
    row: T
  ) => 'unfinished' | 'success' | 'warning' | 'error' | undefined;
  /**
   * Semantic LEFT-EDGE accent: a solid bar down the row's leading edge,
   * marking the rows that still need work in a list the user is working
   * through (an outbound line with nothing issued yet). Same tone vocabulary
   * as rowTint and normally paired with it — the tint colours the whole row,
   * the bar makes a half-finished list legible from across the room while the
   * eye runs down one edge. Table view only (cards carry status via cardTone +
   * badges); stamps data-accent on the row, drawn in CSS on the leading cell
   * as an overlay, so an accented row is exactly as wide as an unaccented one
   * and nothing shifts sideways when a row flips state. Never colour alone:
   * a cell or badge in the row states the same fact in words.
   */
  rowAccent?: (
    row: T
  ) => 'unfinished' | 'success' | 'warning' | 'error' | undefined;
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
  /**
   * Render the toolbar's CONTROL CLUSTER (view toggle · Columns · Settings ·
   * full screen) into this element instead of the table's own toolbar row — for
   * a host that already has a chrome row of its own and shouldn't pay a second
   * one. The line-editor modals use it to lift the controls onto the dialog's
   * header beside "Add batch"; without it the toolbar spends a whole row on
   * three icons a few pixels above the cards.
   *
   * The controls stay part of THIS table (same reactive owner, same popovers) —
   * they're only painted elsewhere, via a Portal. With no filters to show, the
   * toolbar row then renders nothing at all.
   *
   * Pass the element from a `ref` SIGNAL (`ref={setSlot}` … `controlsMount={
   * slot()}`), not a plain variable: the mount point attaches after this table
   * first renders, so a non-reactive read is `undefined` forever.
   */
  controlsMount?: HTMLElement;

  /**
   * Minimum height, in rem, for the table (its `.root`). Without it the table's
   * `min-block-size` is 0 — correct for a fill-the-page list, but in a flex
   * column that can be squeezed (a table inside a modal body), a short viewport
   * collapses the table toward nothing. Set this so the table keeps at least
   * this height and its scrolling ancestor (the dialog body) scrolls instead of
   * the table vanishing. Opt-in: unset keeps the min-block-size:0 default.
   */
  minBodyRem?: number;

  // --- Row selection, owned by the page. ---
  /**
   * Show the leading checkbox column (the multi-select affordance,
   * ui-standards § tables → selection). Pair with selectedIds +
   * onSelectionChange.
   */
  enableSelection?: boolean;
  /**
   * The selected rows, by rowKey. Selected rows carry the brand tint in both
   * views.
   *
   * Valid WITHOUT `enableSelection` too: a master-detail table where the row
   * click reveals that row's detail beside/below it passes the clicked row's
   * key here, so the row the detail belongs to stays marked. No checkbox
   * column is drawn — the tint is the whole affordance, and nothing is
   * toggleable, so the page keeps sole control of what's current (the repack
   * modal's history table, issue #794).
   */
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  /**
   * Render the selection column but with every checkbox DISABLED (the
   * select-all and every row). The column stays visible so the affordance
   * reads as present-but-blocked rather than absent — used where selection is
   * structurally unavailable (e.g. a program internal order whose line set is
   * fixed), not merely empty. No row can be toggled while set.
   */
  selectionDisabled?: boolean;
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

  /**
   * Lay out at CONTENT height instead of owning a scroll box: the table grows
   * to fit its rows and whatever scroller the host provides scrolls it — so
   * content the host puts BELOW the table (a modal's advisory messages) scrolls
   * with the rows instead of being pinned under a table that scrolls
   * internally.
   *
   * Card view only, and deliberately: a row-view table scrolls HORIZONTALLY in
   * that same box (20 columns is normal here), and CSS cannot give one axis
   * `auto` while the other is `visible` — asking for it silently makes both
   * scroll. So in row view the table keeps its box, whatever this says.
   */
  fitContent?: boolean;

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

  // The page's filter bar, resolved ONCE. `filters` is a JSX prop, i.e. a lazy
  // getter that re-instantiates its subtree on every read — and the toolbar
  // reads it twice (once to test for presence, once to render), so without this
  // a whole FilterBar is built and thrown away on every read, taking its
  // signals, focus targets and debounce timers with it
  // (kdd/solid-reactivity-pitfalls §3).
  const filters = children(() => props.filters);

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
  //
  // Memoized: every state field handed to createSolidTable is read via a
  // `get` in its config, and TanStack recomputes internal state off a
  // field's IDENTITY, not deep equality. A plain function here would build a
  // fresh array/object on EVERY read regardless of whether the underlying
  // props changed, which can sustain a self-triggering re-render loop with no
  // real dependency change behind it (this shape of bug caused a genuine
  // slow-load regression in the stocktake detail view — see the `columns`
  // memo below, the same fix applied to every state getter in this file).
  const sorting = createMemo<SortingState>(() =>
    props.sort
      ? [
          {
            id: sortKeyToId(props.columns, props.sort.key),
            desc: props.sort.desc,
          },
        ]
      : []
  );
  const onSortingChange = (updater: Updater<SortingState>) => {
    const sort = functionalUpdate(updater, sorting())[0];
    if (!sort) return;
    const key = sortIdToKey(props.columns, sort.id);
    if (key) props.onSort?.(key, sort.desc);
  };

  // --- Selection ⇄ the page's selectedIds (controlled, like sort/config) ---
  // rowSelection is derived from props.selectedIds; a change is resolved
  // against it and reported back.
  const rowSelection = createMemo<RowSelectionState>(() =>
    Object.fromEntries((props.selectedIds ?? []).map(id => [id, true]))
  );
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

  // Is there a pager to show? Always, when `pagination` is passed — except in a
  // `conditional` pager's zero-row state, where the bar is dropped whole (see
  // the footer below, and Pagination's `paginationState`).
  const paginationVisible = () =>
    props.pagination !== undefined &&
    paginationState(props.pagination) !== 'hidden';

  // --- Column config ⇄ the page's resolved config
  // (order/sizing/pinning/visibility) --- Each field mirrors props.config into
  // TanStack state, with TanStack's own empty default (an absent field means
  // "TanStack decides" — declaration order, all visible, etc.). Each on*Change
  // resolves TanStack's updater against the current value (same as
  // sort/selection above) and hands the concrete value to setConfig — so the
  // page receives a value, not an updater. Inlined per field (no generic
  // helper) — four small, click-through handlers.
  const columnOrder = createMemo<ColumnOrderState>(
    () => props.config?.columnOrder ?? []
  );
  const columnPinning = createMemo<ColumnPinningState>(
    () => props.config?.columnPinning ?? {}
  );
  const columnVisibility = createMemo<VisibilityState>(
    () => props.config?.columnVisibility ?? {}
  );

  // View mode is a config field but NOT a TanStack state (no on*Change) — read
  // it directly. Below the compact breakpoint the table is ALWAYS card (the
  // toggle is suppressed there); above it, the persisted `viewMode` wins,
  // defaulting to 'table'. A page opts a table into card-by-default by seeding
  // its base-band `viewMode: 'card'` config.
  const isCompact = useIsCompact();
  const viewMode = (): ViewMode =>
    isCompact() ? 'card' : (props.config?.viewMode ?? 'table');

  // --- Sort control (card view). With no clickable column headers, sorting
  // moves to a toolbar popover. Its options are the sortable columns (those
  // declaring a sortKey); picking one sorts ascending, re-picking the active
  // one flips direction — the SAME onSort a header click calls, so the page's
  // sort state model is untouched. Shown only in card view (headers handle it
  // in table view) and only when the page wired onSort + has sortable columns.
  const sortableColumns = () =>
    props.columns.filter(c => c.sortKey !== undefined);
  // A column's header text, for a sort-option label. Our `header` is always a
  // FUNCTION (columnTypes.ts narrows it that way so the text re-resolves on a
  // locale change), so it must be CALLED — the old `typeof header === 'string'`
  // test never matched and every option fell back to the raw sortKey
  // ("itemCode", "costPricePerPack"). Same treatment as HeaderCell
  // (renderTemplate), CardView.columnHeaderText and ColumnSettings.label; none
  // of our headers read the context argument, so an empty one is safe. The
  // sortKey stays the last resort for a column with no header at all.
  const columnLabel = (c: Column<T, K, G>): JSX.Element => {
    // A column whose grid header renders iconic or empty names itself with
    // meta.textLabel (the comment column's glyph, the line editor's
    // auto-allocation tick). A sort option has to read as a word, so it wins
    // over the header here exactly as it does in the Columns popover and a
    // card's field caption. Latent while no such column is sortable; wired up
    // so the next one that is doesn't put a glyph in the Sort menu.
    const textLabel = c.meta?.textLabel;
    if (textLabel) return textLabel();
    return typeof c.header === 'function'
      ? c.header({} as HeaderContext<T, unknown>)
      : (c.header ?? c.sortKey ?? '');
  };
  const activeSortColumn = (): Column<T, K, G> | undefined =>
    props.sort
      ? sortableColumns().find(c => c.sortKey === props.sort!.key)
      : undefined;
  const chooseSort = (key: K) => {
    if (props.sort?.key === key) props.onSort?.(key, !props.sort.desc);
    else props.onSort?.(key, false);
  };
  const showSortControl = () =>
    viewMode() === 'card' &&
    props.onSort !== undefined &&
    sortableColumns().length > 0;

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
  const configSizingPx = createMemo<ColumnSizingState>(() => {
    const rem = props.config?.columnSizing ?? {};
    return Object.fromEntries(
      Object.entries(rem).map(([id, r]) => [id, remToPx(r)])
    );
  });
  const pxToRemSizing = (px: ColumnSizingState): ColumnSizingState =>
    Object.fromEntries(Object.entries(px).map(([id, p]) => [id, pxToRem(p)]));
  const columnSizing = (): ColumnSizingState =>
    transientSizing() ?? configSizingPx();

  // Table view shows a column unless it's declared card-only
  // (meta.hideOnTable). TanStack keeps the FULL column set (config/order/sizing
  // stay whole); we just skip rendering a card-only column's header/body/footer
  // cells here, and the Columns popover drops card-only columns in table view
  // (see ColumnSettings). A card-only column with a footer must not force a
  // <tfoot>, so hasFooter gates on this too. (Card grouping is card-view only —
  // see props.cardGroups / CardView — so table view no longer filters by
  // group.)
  const showInTableView = (columnDef: {
    meta?: { hideOnTable?: boolean };
  }): boolean => !columnDef.meta?.hideOnTable;

  // Does any table-view column declare a `footer`? Drives whether the footer
  // band renders at all — a table with no summed columns has no <tfoot>.
  const hasFooter = (): boolean =>
    props.columns.some(col => col.footer !== undefined && showInTableView(col));
  // Memoized: TanStack treats a new `columns` identity as a config change and
  // updates its internal state accordingly, which (via the getter below) can
  // re-trigger whatever reactive scope reads `props.columns` — a loop with no
  // real change behind it if `.map()` reran on every read regardless of
  // whether `props.columns` itself changed. Memoizing on `props.columns`
  // breaks that: the mapped array is only rebuilt when the caller's columns
  // actually change.
  const columnDefs = createMemo(() => props.columns.map(toColumnDef));
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
  // The rendered sticky offset of each pinned column, keyed by column id: how
  // far its frozen edge sits from the box's inline-start (left-pinned) or
  // inline-end (right-pinned). Measured off the header row — see pinnedStyle
  // for why TanStack's own numbers can't be used.
  const [pinnedOffsets, setPinnedOffsets] = createSignal<
    Record<string, number>
  >({});
  let scrollBox: HTMLDivElement | undefined;

  // Walk the header row from each end, accumulating RENDERED widths for as long
  // as the cells are pinned to that side (a frozen block is always a prefix or
  // suffix of the row). The leading select cell is the first cell measured, so
  // left offsets include it without a special case.
  const measurePinnedOffsets = () => {
    const headerRow = scrollBox?.querySelector('thead tr');
    if (!headerRow) return; // card view / pre-mount: keep the last measurement
    const cells = [...headerRow.children] as HTMLElement[];
    const next: Record<string, number> = {};

    let fromStart = 0;
    for (const cell of cells) {
      if (cell.dataset.pinned !== 'left') break;
      if (cell.dataset.columnId) next[cell.dataset.columnId] = fromStart;
      fromStart += cell.getBoundingClientRect().width;
    }

    let fromEnd = 0;
    for (const cell of [...cells].reverse()) {
      if (cell.dataset.pinned !== 'right') break;
      if (cell.dataset.columnId) next[cell.dataset.columnId] = fromEnd;
      fromEnd += cell.getBoundingClientRect().width;
    }

    // Only publish real changes: re-rendering identical offsets would churn
    // every pinned cell's style on each resize tick.
    setPinnedOffsets(current => {
      const keys = Object.keys(next);
      const same =
        keys.length === Object.keys(current).length &&
        keys.every(id => current[id] === next[id]);
      return same ? current : next;
    });
  };

  // A header label clamps to two lines (.thText), and a label that needs more
  // loses its tail. Chromium does NOT paint the line-clamp ellipsis under
  // `text-align: end`, so on a right-aligned (numeric) column that loss is
  // SILENT — "Target stock (AMC)" renders as "Target stock" with no marker of
  // any kind. Start/centre headers ellipsise correctly, and neither
  // `text-overflow: ellipsis` nor `block-ellipsis: auto` overrides the
  // end-aligned case (all four measured 2026-08-11), so there is no CSS-only
  // fix: the truncated headers have to be found and stamped.
  //
  // data-clipped flips the label to start alignment, where the ellipsis DOES
  // paint (see DataTable.module.css), and `title` hands back the full label on
  // hover — the same native hover-reveal a clipped body cell gets
  // (revealIfClipped in TableRow.tsx). Screen readers were never affected: the
  // full label stays in the DOM either way, so this is purely a sighted-user
  // repair.
  //
  // Measured with the other layout facts because a resize drag, a hidden
  // column, or a density change is exactly what turns clipping on and off. The
  // work is bounded to ONE header row (not the body), and the attributes it
  // writes change no widths, so it can't feed the observer that calls it.
  const markClippedHeaders = () => {
    const headerRow = scrollBox?.querySelector('thead tr');
    if (!headerRow) return; // card view / pre-mount
    for (const cell of [...headerRow.children] as HTMLElement[]) {
      const label = cell.querySelector<HTMLElement>(`.${styles.thText}`);
      if (!label) continue; // the leading select cell carries no label
      // The clamp hides whole LINES, so an over-long label overflows vertically.
      if (label.scrollHeight > label.clientHeight) {
        cell.dataset.clipped = 'true';
        cell.title = label.textContent ?? '';
      } else {
        delete cell.dataset.clipped;
        cell.removeAttribute('title');
      }
    }
  };

  // The edge offset is MEASURED (pinnedOffsets, above), because the only widths
  // TanStack can offer — getStart('left') / getAfter('right') — sum the
  // CONFIGURED sizes, and under our auto table layout a column's `size` is only
  // a min-width FLOOR: columns flex past it to fill the table. Summing floors
  // puts a second pinned column short of where the first one actually ends, so
  // it slides over its neighbour as you scroll and only freezes once it reaches
  // the too-small offset (a 64px-configured column rendering 90px overlapped by
  // 26px). Only columns that flex are affected, which is why it looked
  // intermittent. Pre-existing; reported by Carl 2026-07-28.
  //
  // Those getters remain the FALLBACK for the first paint, before there's a
  // header row to measure — the effect below corrects it in the same frame.
  // Both index by column id (not object identity), so a cell-context column
  // resolves against the table's column list; the earlier indexOf(column)
  // matched by reference and missed, summing the column's own width so a single
  // right-pinned column floated one column-width off the edge. The left
  // fallback adds leadingWidth() for the (also-pinned) leading select column;
  // measured left offsets already include it, since the select cell is the
  // first cell measured.
  const pinnedStyle = (column: TanColumn<T>): JSX.CSSProperties | undefined => {
    const side = column.getIsPinned();
    if (!side) return undefined;
    const measured = pinnedOffsets()[column.id];
    if (side === 'left') {
      const left = measured ?? leadingWidth() + column.getStart('left');
      return { position: 'sticky', left: `${left}px` };
    }
    return {
      position: 'sticky',
      right: `${measured ?? column.getAfter('right')}px`,
    };
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

  // Is content hidden past the scroll box's left / right edge? Stamped on the
  // box as data-hidden-left / data-hidden-right, which is what reveals each
  // frozen block's shadow: a frozen column only casts one while content is
  // actually passing UNDER it (#617 — the always-on version read as a hard
  // band; see DataTable.module.css). Deliberately not "the table overflows":
  // an unscrolled table has clear air beside its leading column even though it
  // overflows to the right.
  //
  // Both edges are PHYSICAL (the leading column pins physical-left in either
  // direction), which takes reconciling the two scrollLeft conventions —
  // hiddenEdges owns that arithmetic and is unit-tested in scrollEdges.test.ts.
  //
  // Setting the same boolean is a no-op in Solid, so a scroll costs two
  // comparisons and re-renders nothing until an edge state actually flips.
  const [hiddenLeft, setHiddenLeft] = createSignal(false);
  const [hiddenRight, setHiddenRight] = createSignal(false);

  const syncHiddenEdges = () => {
    if (!scrollBox) return;
    const { left, right } = hiddenEdges(scrollBox, isRtl());
    setHiddenLeft(left);
    setHiddenRight(right);
  };

  // Both the hidden edges and the pinned offsets are layout facts, so they're
  // re-read together whenever layout could have moved.
  const remeasure = () => {
    syncHiddenEdges();
    measurePinnedOffsets();
    markClippedHeaders();
  };

  // Scrolling isn't the only thing that moves these — hiding a column, dragging
  // a resize handle, changing density or page size, or resizing the window all
  // change widths with no scroll event. Observing the box AND the table covers
  // both (the box for viewport-driven changes, the table for content-driven
  // ones). Publishing only real changes (see measurePinnedOffsets) keeps this
  // from feeding itself: the styles it writes are offsets, which move nothing.
  onMount(() => {
    if (!scrollBox) return;
    const observer = new ResizeObserver(remeasure);
    observer.observe(scrollBox);
    const table = scrollBox.querySelector('table');
    if (table) observer.observe(table);
    remeasure();
    onCleanup(() => observer.disconnect());
  });

  // Column state can redistribute widths WITHOUT resizing the table (it's
  // width: 100% of the box), which the observer above would never see — so
  // re-measure on the state that reshuffles columns. A locale flip is in here
  // too: it swaps the scrollLeft convention with nothing scrolling or resizing.
  // Solid runs effects after the DOM is patched, and getBoundingClientRect
  // forces the pending layout, so this reads post-change widths.
  createEffect(() => {
    const state = table.getState();
    void state.columnPinning;
    void state.columnVisibility;
    void state.columnOrder;
    void state.columnSizing;
    void viewMode();
    void viewDensity();
    void isRtl();
    remeasure();
  });

  // Which cells sit on a frozen BLOCK's outer edge — the boundary the scrolling
  // content actually passes: the LAST left-pinned column and the FIRST
  // right-pinned one. That edge carries the freeze cue (a 1px seam at rest, the
  // shadow once content is under it); columns inside the block carry neither,
  // or the block would read as several separate frozen strips.
  //
  // Read from the per-side lists, NOT from getVisibleLeafColumns(): the two are
  // ordered differently, and only the per-side ones match the DOM. Header
  // groups are built [...left, ...center, ...right] with each pinned block in
  // its columnPinning array order, while getVisibleLeafColumns() follows
  // columnOrder. Reordering two pinned columns rewrites columnOrder alone, so
  // the two disagree and the cue stayed on the column that WAS outermost (Carl
  // 2026-07-28). Filtered by showInTableView for the same reason we don't use
  // TanStack's getIsLastColumn('left'): a column that isn't rendered can't
  // carry the cue.
  const framedPinned = (side: 'left' | 'right') =>
    (side === 'left'
      ? table.getLeftVisibleLeafColumns()
      : table.getRightVisibleLeafColumns()
    ).filter(column => showInTableView(column.columnDef));
  // Outermost = furthest from the scrolling content: the LAST left-pinned
  // column, the FIRST right-pinned one.
  const lastLeftPinnedId = () => framedPinned('left').at(-1)?.id;
  const firstRightPinnedId = () => framedPinned('right')[0]?.id;

  const frozenEdge = (column: TanColumn<T>): 'left' | 'right' | undefined => {
    if (column.id === lastLeftPinnedId()) return 'left';
    if (column.id === firstRightPinnedId()) return 'right';
    return undefined;
  };

  // With no data column pinned left, the leading selection column IS the left
  // block, so the cue falls on it (the CSS withholds only its 1px seam — #617
  // wants no line beside the checkbox, shadow or not).
  const leadingIsFrozenEdge = () => lastLeftPinnedId() === undefined;

  // Per-facet applicability for the Settings popover's resets (issue #572):
  // each reset is enabled only when that facet actually differs from the
  // default, derived from the resolved config (reactive) so it needs no extra
  // per-page plumbing. "Show all columns" keys on any column being hidden, not
  // a user override, so it's offered whenever there's something to reveal.
  const columnOrderChanged = () => {
    const order = props.config?.columnOrder;
    if (!order || order.length === 0) return false;
    const def = columnDefs().map(d => d.id);
    return order.length !== def.length || order.some((id, i) => id !== def[i]);
  };
  const anyColumnHidden = () =>
    Object.values(props.config?.columnVisibility ?? {}).some(v => v === false);
  const anyColumnSized = () =>
    Object.keys(props.config?.columnSizing ?? {}).length > 0;
  const anyColumnPinned = () => {
    const pinning = props.config?.columnPinning;
    return (pinning?.left?.length ?? 0) + (pinning?.right?.length ?? 0) > 0;
  };

  // The toolbar's icon-control cluster — the inline loading spinner, the card
  // Sort control, the view toggle, Columns, Settings and full screen. A
  // FUNCTION, not a stored element: it renders either in the table's own
  // toolbar or (controlsMount) portalled into the host's chrome row, and a
  // shared element node can only live in one place. Exactly one call renders.
  // Whether the toolbar ROW renders at all. With the controls lifted into a
  // host's chrome (controlsMount) and no filters to show, it doesn't — and the
  // table then loses the hairline that row carried along its bottom edge, which
  // is what separated the header from whatever sits above it. The seam moves to
  // the table area instead (see .root[data-no-toolbar] in the CSS).
  const hasToolbar = () =>
    !!filters() || !!props.pagination || !props.controlsMount;

  const controls = (): JSX.Element => (
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
      {/* Sort control — card view only (no clickable headers there): a
            labelled popover showing the active sort field + direction, listing
            the sortable columns. Calls the same onSort as a header click. */}
      <Show when={showSortControl()}>
        <Popover
          placement="bottom-end"
          triggerClass={styles.sortTrigger}
          triggerTestId="table-sort"
          triggerLabel={t('table.sort')}
          closeOnClickInside
          class={styles.controlPopover}
          trigger={
            <>
              <span class={styles.sortTriggerLabel}>
                {activeSortColumn()
                  ? columnLabel(activeSortColumn()!)
                  : t('table.sort')}
              </span>
              {/* Same direction glyph as the table header's sort indicator
                    (↓ desc / ↑ asc, .sortIndicator), pushed to the pill's
                    trailing edge (justify-content) regardless of label width. */}
              <Show when={props.sort}>
                <span class={styles.sortIndicator} aria-hidden="true">
                  {props.sort!.desc ? '↓' : '↑'}
                </span>
              </Show>
            </>
          }
        >
          <div class={styles.sortMenu}>
            <For each={sortableColumns()}>
              {col => (
                <button
                  type="button"
                  class={styles.sortMenuItem}
                  data-testid={`table-sort-${col.sortKey}`}
                  data-active={props.sort?.key === col.sortKey ? '' : undefined}
                  onClick={() => chooseSort(col.sortKey!)}
                >
                  <span>{columnLabel(col)}</span>
                  <Show when={props.sort?.key === col.sortKey}>
                    <span class={styles.sortIndicator} aria-hidden="true">
                      {props.sort!.desc ? '↓' : '↑'}
                    </span>
                  </Show>
                </button>
              )}
            </For>
          </div>
        </Popover>
      </Show>
      {/* View toggle — a single Card-view control matching the other icon
            controls (no border): grey when in table view, blue when card view
            is active; clicking flips between the two. Above the compact
            breakpoint only (below it the table is always card, so it's
            hidden). Opt-in per table (showCardToggle) and needs setConfig to
            persist the choice. */}
      <Show when={props.showCardToggle && !isCompact() && props.setConfig}>
        <button
          type="button"
          class={`${styles.controlButton} ${viewMode() === 'card' ? styles.controlButtonActive : ''}`}
          data-testid="table-view-toggle"
          aria-pressed={viewMode() === 'card'}
          aria-label={t('table.view-cards')}
          title={t('table.view-cards')}
          onClick={() =>
            props.setConfig?.(
              'viewMode',
              viewMode() === 'card' ? 'table' : 'card'
            )
          }
        >
          <CardViewIcon />
        </button>
      </Show>
      {/* Columns — the per-column panel (show / move / pin;
            ui-standards § tables → column management: one predictable place,
            headers stay clean). Only when the page wired config controls
            (setConfig present); otherwise there's nothing to configure. */}
      <Show when={props.setConfig}>
        <Popover
          placement="bottom-end"
          trigger={<Columns3CogIcon />}
          triggerLabel={t('table.edit-columns')}
          triggerProps={{ title: t('table.edit-columns') }}
          triggerClass={styles.controlButton}
          class={styles.controlPopover}
        >
          <ColumnSettings
            table={table}
            setConfig={props.setConfig}
            viewMode={viewMode()}
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
          triggerProps={{ title: t('table.settings') }}
          triggerClass={styles.controlButton}
          class={styles.controlPopover}
        >
          <TableSettings
            table={table}
            config={props.config}
            density={viewDensity()}
            setConfig={props.setConfig}
            onReset={resetConfig}
            resetDisabled={props.configIsDefault}
            orderChanged={columnOrderChanged()}
            anyColumnHidden={anyColumnHidden()}
            anyColumnSized={anyColumnSized()}
            anyColumnPinned={anyColumnPinned()}
            onSaveGlobalDefault={props.onSaveGlobalDefault}
            // Rows per page lives here now, not in the footer (which is the
            // pager alone). Passed straight through from the page's pagination
            // state — the table owns no page state of its own.
            pageSize={props.pagination?.pageSize}
            pageSizes={props.pagination?.pageSizes}
            onPageSizeChange={props.pagination?.onPageSizeChange}
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
          title={t('table.toggle-full-screen')}
          onClick={() => setFullScreen(!fullScreen())}
        >
          {fullScreen() ? <MinimiseIcon /> : <MaximiseIcon />}
        </button>
      </Show>
    </div>
  );

  return (
    // data-datatable: a stable, un-hashed styling hook so a fill-body page can
    // full-bleed the table from its own CSS module (Page.module.css) — a
    // descendant selector can't name this .root class across CSS Modules.
    <div
      class={`${styles.root} ${overlay() ? styles.fullScreen : ''}`}
      data-datatable
      style={
        props.minBodyRem != null
          ? { 'min-block-size': `${props.minBodyRem}rem` }
          : undefined
      }
      data-no-toolbar={hasToolbar() ? undefined : ''}
      // Content height, for a host that scrolls the table together with what
      // sits below it (see `fitContent`). Card view only — a row view's
      // horizontal scrolling needs the box.
      data-fit-content={
        props.fitContent && viewMode() === 'card' ? '' : undefined
      }
    >
      {/* The table toolbar (ui-standards § tables): one bar above the scroll
          area — the page-composed filter bar inline-start, the control cluster
          inline-end. Outside the scroll region, so it never scrolls with the
          table content and doesn't collide with the scroll box's rounded
          border. Skipped entirely when the controls are mounted elsewhere
          (controlsMount) and there are no filters — an empty bar would spend a
          row, and its bottom hairline would draw a line under nothing. */}
      <Show when={hasToolbar()}>
        <div class={styles.toolbar}>
          {/* Filter bar slot — the page's <FilterBar>, living WITH the table
              (ui-standards § tables → filtering), not in the page header. Pure
              placement: filter state stays page-owned. */}
          <Show when={filters()}>
            <div class={styles.toolbarFilters}>{filters()}</div>
          </Show>
          {/* The row count — the one fact the visible rows cannot supply once a
              set runs past a page, and free here: this row exists whatever the
              data does, and it sits beside the filters that change the number.
              Read from `pagination.total`, so any paginated table shows it
              without the host passing anything extra. */}
          <Show when={props.pagination}>
            {pagination => (
              <span class={styles.toolbarCount} data-testid="table-row-count">
                {tPlural('pagination.rows-total', pagination().total)}
              </span>
            )}
          </Show>
          <Show when={!props.controlsMount}>{controls()}</Show>
        </div>
      </Show>
      {/* Controls lifted into the host's own chrome row (see controlsMount).
          A Portal, so they keep this table's reactive owner and context —
          the popovers and the view toggle behave identically there. */}
      <Show when={props.controlsMount}>
        {mount => <Portal mount={mount()}>{controls()}</Portal>}
      </Show>
      {/* tableArea fills the remaining height between the toolbar and the
          footer bar, so the scroll box inside it is full-height even for a
          short list. */}
      <div class={styles.tableArea}>
        <div
          class={styles.tableScroll}
          ref={scrollBox}
          data-view={viewMode()}
          data-empty={table.getRowModel().rows.length === 0 ? '' : undefined}
          data-hidden-left={hiddenLeft() ? '' : undefined}
          data-hidden-right={hiddenRight() ? '' : undefined}
          onScroll={syncHiddenEdges}
        >
          {/* One <table> for BOTH views — card view is now rows in the SAME
              table (each card is a full-width <tr>), so columns/scroll/selection
              are shared. The header row is table-view only (hidden in card view:
              a card's fields carry their own labels via LabelledValue). The table
              renders even with NO rows so the column headers stay visible — the
              empty state / spinner sits BELOW it (matching the current app). */}
          {/* KB-S2's "inside a table cell" fact, provided around the TABLE and
              nothing else: a numeric field in a cell moves the caret with the
              arrows instead of stepping its value. Scoped here rather than at the
              root, because the root also holds page-supplied content that is NOT
              in a cell — the FilterBar in the toolbar (whose numeric filter chips
              are NumberFields), the selection bar's actions, the empty slot — and
              those must keep stepping. Provided ONCE for the whole table, never
              per <td> (see inTableCell.ts); <Dialog> resets it, so a line editor
              opened from a row does not inherit it. */}
          <InTableCellContext.Provider value={true}>
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
                            data-frozen-edge={
                              leadingIsFrozenEdge() ? 'left' : undefined
                            }
                            style={leadingPinnedStyle(0)}
                          >
                            {/* Partial selection (some rows on this page, not
                              all) shows the indeterminate dash (ui-standards
                              § tables → row selection). From indeterminate the
                              next click clears (→ select none), not select-all:
                              any active selection (indeterminate OR all) toggles
                              off; only an empty selection selects all. NOT
                              TanStack's default handler, which keys off the
                              native box's post-click checked value and so goes
                              indeterminate → all. */}
                            <BareCheckbox
                              class={styles.selectBox}
                              aria-label={t('table.select-all')}
                              data-testid="select-all-rows-checkbox"
                              disabled={props.selectionDisabled}
                              checked={table.getIsAllRowsSelected()}
                              indeterminate={table.getIsSomeRowsSelected()}
                              onChange={e => {
                                const anySelected =
                                  table.getIsAllRowsSelected() ||
                                  table.getIsSomeRowsSelected();
                                table.toggleAllRowsSelected(!anySelected);
                                // The native click already flipped the DOM box to
                                // checked; toggling OFF from indeterminate leaves
                                // the controlled `checked` value false→false, so
                                // Solid's binding never re-runs to undo it. Sync
                                // the box to the state we just set.
                                e.currentTarget.checked = !anySelected;
                              }}
                            />
                          </th>
                        </Show>
                        {/* Skip a card-only column's header cell (meta.hideOnTable);
                          TanStack still holds every column — see showInTableView. */}
                        <For each={headerGroup.headers}>
                          {header => (
                            <Show
                              when={showInTableView(header.column.columnDef)}
                            >
                              <HeaderCell
                                header={header}
                                pinnedStyle={pinnedStyle}
                                frozenEdge={frozenEdge}
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
                        cardGroups={props.cardGroups}
                        enableSelection={props.enableSelection ?? false}
                        selectionDisabled={props.selectionDisabled ?? false}
                        onRowClick={props.onRowClick}
                        rowTone={row =>
                          (props.cardTone ?? props.rowTone)?.(row)
                        }
                        rowState={props.rowState}
                      />
                    </Match>
                    <Match when={viewMode() === 'table'}>
                      <For each={table.getRowModel().rows}>
                        {row => (
                          <TableRow
                            row={row}
                            enableSelection={props.enableSelection ?? false}
                            selectionDisabled={props.selectionDisabled ?? false}
                            onRowClick={props.onRowClick}
                            rowState={props.rowState}
                            rowTone={props.rowTone}
                            rowTint={props.rowTint}
                            rowAccent={props.rowAccent}
                            pinnedStyle={pinnedStyle}
                            leadingPinnedStyle={leadingPinnedStyle}
                            frozenEdge={frozenEdge}
                            leadingIsFrozenEdge={leadingIsFrozenEdge()}
                            cellVisible={cell =>
                              showInTableView(cell.column.columnDef)
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
                  content (a string, or a rendered component). */}
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
                              when={showInTableView(header.column.columnDef)}
                            >
                              <td
                                class={styles.tf}
                                data-align={header.column.columnDef.meta?.align}
                                data-testid={`footer-${header.column.id}`}
                              >
                                {renderTemplate(
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
          </InTableCellContext.Provider>
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
          Page-level selection footer and this bar just shows the pager.
          A `conditional` pager (spec/ui-standards § tables → pagination) can
          also ask for NO footer at all — its zero-row state — and the bar goes
          with it: the band's border and padding are drawn here, so leaving it
          behind would show an empty strip where the pager used to be. A live
          selection still brings the bar back (it is the selection's own
          face). */}
      <Show when={paginationVisible() || selectionBarActive()}>
        <ContentFooter
          class={styles.tableFooter}
          testId={selectionBarActive() ? 'actions-footer' : 'table-footer'}
        >
          <Show
            when={selectionBarActive()}
            fallback={
              <Show when={paginationVisible()}>
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
