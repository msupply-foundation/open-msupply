import {
  createMemo,
  createResource,
  createSignal,
  Show,
  Suspense,
} from 'solid-js';
import type { Component } from 'solid-js';
import { useNavigate, useParams } from '@solidjs/router';
import { graphqlFetch } from '@/api/graphql';
import { t } from '@/intl';
import { formatNumber } from '@/intl/formatNumber';
import { Page } from '@/ui/layout/Page/Page';
import { Header } from '@/ui/layout/Header/Header';
import { Breadcrumb } from '@/ui/layout/Header/Breadcrumb';
import { HeaderButtons } from '@/ui/layout/Header/HeaderButtons';
import { ContentFooter } from '@/ui/layout/ContentFooter/ContentFooter';
import { ContentFooterActions } from '@/ui/layout/ContentFooter/ContentFooterActions';
import { Tabs, TabList, TabPanel, type TabDef } from '@/ui/elements/tabs/Tabs';
import { Button } from '@/ui/elements/buttons/Button';
import { createAddAction } from '@/ui/utils/keyActions';
import { ALT_M, ALT_N } from '@/ui/utils/shortcuts';
import { Spinner } from '@/ui/elements/feedback/Spinner';
import { SidebarIcon, MinusCircleIcon, PlusCircleIcon } from '@/ui/icons';
import {
  DataTable,
  type CardGroup,
  type Column,
  type SortState,
} from '@/ui/elements/table/DataTable';
import {
  AbsentValue,
  CommentHeader,
  getCellDefinition,
  getDateCell,
  getExpiryDateCell,
} from '@/ui/elements/table/tableHelpers';
import {
  Pagination,
  type PaginationProps,
} from '@/ui/elements/table/Pagination';
import { createTableConfig } from '@/api/createTableConfig';
import {
  StocktakeDetail,
  StocktakeLines,
  type StocktakeDetailResult,
  type StocktakeInfoFragment,
  type StocktakeLineFragment,
  type StocktakeLinesVariables,
  type UpdateStocktakeVariables,
} from './lines/stocktakeDetail.generated';
import {
  StocktakeLineEditModal,
  type StocktakeLineEditItem,
} from './edit-modal/StocktakeLineEditModal';
import { StocktakeStatusFooter } from './StocktakeStatusFooter';
import { StocktakeDetailToolbar } from './StocktakeDetailToolbar';
import { StocktakeLineFilters } from './StocktakeLineFilters';
import { StocktakeSidePanel } from './StocktakeSidePanel';
import { createSidePanelOpen } from '@/ui/layout/SidePanel/createSidePanelOpen';
import { ActivityLogPanel } from '@/domain/activityLog';
import { StocktakeDocumentsTab } from './StocktakeDocumentsTab';
import {
  DeleteLinesAction,
  ChangeLocationAction,
  ReduceToZeroAction,
  ExportPrintAction,
} from './actions';
import { saveStocktakeFields } from './stocktakeUpdate';
import type { LineEditCommit } from './lines/stocktakeLineUpdate';
import type { LineErrors } from './lines/stocktakeLineErrors';
import type { StocktakeLineFilter } from './stocktakeLineFilter';
import { createDebouncedEdit } from '@/domain/debouncedEdit';
import {
  fetchLocationsWithVolume,
  type LocationWithVolume,
} from '@/domain/location';
import type { StocktakeEditFields } from './stocktakeEdit';
import { useUrlQueryState } from '@/list/urlQueryState';
import {
  DEFAULT_PAGE_SIZE,
  initialPageSize,
  rememberPageSize,
} from '@/list/pageSize';
import { clampPageOffset, settledTotal } from '@/list/clampPageOffset';
import { stripEmpty } from '@/typeHelpers';
import { stocktakePreferences } from '@/store/storeContext';
import { dosesCounted, dosesPerUnit } from './lines/doses';
import { isUncounted, lineDifference } from './lines/stocktakeLine';
import styles from './StocktakeDetailView.module.css';

// The stocktake detail view. The page shell (breadcrumb back to the list + an
// editable description + filters), the lines in a SERVER-paginated DataTable
// (server sorted / filtered / paged), an Additional-info side panel, and the
// stocktake-level status footer (on-hold / finalise). Clicking a row opens the
// line-edit modal; a save REFETCHES the current lines page (kdd/stocktake-line-
// editing — the small page is cheap to re-pull, so we don't splice mutation
// results in place anymore).
//
// TWO independent queries (kdd/stocktake-line-editing): `info`
// (stocktakeDetail, the header/footer/side-panel fields) and `lines`
// (stocktakeLines, one server-filtered/sorted page). A stocktake-LEVEL save
// mutates `info` in place (a single node, no pagination); a LINE save refetches
// only the `lines` page.
//
// A finalised or on-hold (locked) stocktake is read-only (OMS
// isStocktakeDisabled): row-click, the description/side-panel fields, and
// Finalise are all disabled; on-hold can still be lifted.

type Line = StocktakeLineFragment;

// The `info` resource's element type — the stocktakeDetail response narrowed to
// its success member ({ __typename: 'StocktakeNode' } & StocktakeInfoFragment).
// `mutate` callbacks are typed to this (spreading a saved StocktakeInfo
// fragment over it keeps __typename).
type StocktakeInfoNode = Extract<
  StocktakeDetailResult['stocktake'],
  { __typename: 'StocktakeNode' }
>;

// The server sort-field union (from codegen) — a column can only ever name a
// real server sort key (kdd/type-safety). Columns whose data the server can't
// sort on (manufacture date, unit, doses, difference, donor, manufacturer,
// campaign, comment — see spec contract § backend gaps) simply omit `sortKey`.
type SortKey = NonNullable<StocktakeLinesVariables['sort']>[number]['key'];

// Card view (below 600px): the item name is the card title (headerPosition
// 'primary') and the counted-packs its badge; every other column drops into
// one collapsed "More details" disclosure (ui-standards → CARD_TABLE_MODEL).
type GroupKey = 'more';
const CARD_GROUPS: CardGroup<Line, GroupKey>[] = [
  { key: 'more', disclosure: 'closed' },
];

// A finalised or on-hold (locked) stocktake can't have its content edited (OMS
// isStocktakeDisabled).
const isDisabled = (node: StocktakeInfoFragment) =>
  node.status !== 'NEW' || node.isLocked;

// The URL-backed view state (kdd/url-structure): filter + sort + pagination in
// the single `?query=` JSON param, so a filtered/sorted/paged view is shareable
// and survives reload + back-nav. All three conform to the generated
// stocktakeLines variables (no remapping — kdd/type-safety). Selection and the
// side-panel open state stay local (transient UI). Mirrors the stocktakes LIST.
type DetailUrlState = {
  filter: StocktakeLineFilter;
  sort: NonNullable<StocktakeLinesVariables['sort']>;
  offset: number;
  first: number;
  // The "show error lines" filter (issue #791 follow-up): a BOOLEAN flag, not
  // the ids. The offending line ids live in transient error state (lineErrors),
  // not the URL — so a shared/reloaded link never carries a stale id list, and
  // the flag resolves against whatever errors are currently stamped (none after
  // a reload ⇒ the filter is simply absent). When on, the lines query injects
  // `id.equalAny: [<error ids>]`.
  showError: boolean;
};

const DEFAULT_URL_STATE: DetailUrlState = {
  // The item search is the screen's default filter (ui-standards § tables →
  // filtering): seeded present-as-null so its chip is on the bar from the
  // start; stripEmpty keeps it out of the query until typed.
  filter: { itemCodeOrName: null },
  // Default sort: item name ascending (matches OMS's default line order).
  sort: [{ key: 'itemName', desc: false }],
  offset: 0,
  first: DEFAULT_PAGE_SIZE,
  showError: false,
};

const StocktakeDetailView: Component = () => {
  const params = useParams<{ storeId: string; stocktakeId: string }>();
  const navigate = useNavigate();
  // Filter + sort + pagination are URL-backed (shareable, survive reload/back-
  // nav) in one `?query=` param. Thin accessors over that single query.
  const { query, setQuery } = useUrlQueryState<DetailUrlState>({
    ...DEFAULT_URL_STATE,
    first: initialPageSize(),
  });
  const filter = () => query().filter;
  const currentSort = (): SortState<SortKey> | undefined => {
    const s = query().sort[0];
    return s ? { key: s.key, desc: s.desc ?? false } : undefined;
  };
  // The current line sort as a report sort ({ key, desc }) for Export/Print, so
  // the generated document orders rows the way the user sees them
  // (spec/stocktakes S3 "respecting the current sort").
  const reportSort = (): { key: string; desc: boolean } | undefined => {
    const s = query().sort[0];
    return s ? { key: s.key, desc: s.desc ?? false } : undefined;
  };

  const [selectedIds, setSelectedIds] = createSignal<string[]>([]);
  // Details-panel open state: responsive default (open on very wide viewports —
  // ≥1536px, the captured app's widest breakpoint — closed otherwise), with a
  // user's explicit open/close choice persisted across reloads (spec
  // ui-standards/layout.md → page regions). Shared helper so every spec-built
  // detail view inherits the same behaviour, rather than a bare createSignal.
  // The header's More button opens it; the panel's own close button (top
  // inline-end) closes it — both go through setSidePanelOpen, so both count as
  // an explicit choice.
  const [sidePanelOpen, setSidePanelOpen] = createSidePanelOpen();
  // Per-line errors from the last failed finalise/bulk action, keyed by line
  // id → the error's __typename (the shared LineErrors shape, kept raw). The
  // Snapshot column renders it inline; cleared when a fresh page lands.
  const [lineErrors, setLineErrors] = createSignal<LineErrors>(new Map());
  // The stamped error line ids — what the "show error lines" filter (showError)
  // resolves to at query time (id.equalAny). Empty when nothing is stamped, so
  // the filter is treated as absent rather than sending an empty equalAny
  // (which the server reads as "match nothing").
  const errorLineIds = (): string[] => [...lineErrors().keys()];
  const hasErrors = (): boolean => lineErrors().size > 0;
  // Column config (order/sizing/visibility) persists per user/store. The extra
  // editable columns start HIDDEN by default so the table isn't overwhelming —
  // the user reveals them via the column-visibility settings.
  const tableConfig = createTableConfig({
    tableId: 'stocktake-detail',
    defaultConfig: {
      base: {
        // Hidden by default (the user reveals them via the column-visibility
        // control) — the spec's "hidden by default" set for the detail line
        // table (spec/stocktakes S3), which mirrors OMS's defaultHideOnMobile
        // columns, minus Location, which stays visible so stock placement is
        // seen without reconfiguring. Snapshot / Counted / Difference / Reason
        // / Comment stay visible. Gated columns (dosesPerUnit / donor) only
        // appear in the table at all when their store preference is on; this
        // sets their initial visibility once present.
        columnVisibility: {
          manufactureDate: false,
          itemUnit: false,
          packSize: false,
          dosesPerUnit: false,
          donor: false,
          manufacturer: false,
          campaign: false,
        },
        // Code pinned to the inline-start edge, so the identifier stays put
        // while the counting columns scroll horizontally — this table is wide
        // enough to scroll on every device the app targets, and a row whose
        // code has scrolled away is a row you can't be sure you're counting.
        // Only a DEFAULT: the user's own pinning wins over it, and the Columns
        // popover's reset returns here rather than to no pins at all.
        //
        // 'item.code' is the column's id (the accessor path, which the testid
        // contract also uses) — NOT 'code'. A key that matches no column pins
        // nothing and reports no error.
        columnPinning: { left: ['item.code'] },
      },
    },
  });
  // The line-edit modal's open state (undefined = closed). The modal
  // self-queries its own data (its item's stocktake lines + stock lines), so we
  // only tell it WHICH item to open on (or none, in the item-search state):
  // - { itemId, lineId }: opened from a ROW click — starts editing that item,
  //   and can step through the list via "OK & next" (it pages the server
  //   itself). lineId is the clicked batch, so the editor can scroll/focus it.
  // - {}: opened from "Add item" — starts in the item-search state.
  type EditState = { itemId?: string; lineId?: string } | undefined;
  const [editState, setEditState] = createSignal<EditState>();

  // The content region's three tabs (OMS parity): Details (the line table),
  // Documents (files attached to the stocktake) and Log (the stocktake's
  // activity log). Local UI state — not URL-backed; a reload lands on Details.
  // The Documents tab reads the node's `documents` list; the Log tab
  // self-queries its own activity log.
  const [activeTab, setActiveTab] = createSignal('details');

  // The line table's pager. It lives in the screen's bottom bar — the status
  // footer, or the selection footer while rows are ticked — rather than in a
  // band of its own under the table (spec/ui-standards § tables → pagination):
  // that bar is present at every line count, so hosting the pager there costs
  // no extra row, and `conditional` means it renders nothing at all until the
  // lines outrun one page, leaving the bar as it was and the height to the
  // rows.
  const linePagination = (): PaginationProps => ({
    offset: query().offset,
    pageSize: query().first,
    total: totalCount(),
    onOffsetChange: offset => setQuery({ ...query(), offset }),
    onPageSizeChange: first => {
      // The remembered page size (D106) — it rode the DataTable's own
      // pagination prop, which this accessor replaced when the pager moved
      // into the status footer, so it has to travel with the handler.
      rememberPageSize(first);
      setQuery({ ...query(), first, offset: 0 });
    },
  });
  const tabs = (): TabDef[] => [
    { value: 'details', label: t('label.details') },
    { value: 'documents', label: t('label.documents') },
    { value: 'log', label: t('label.log') },
  ];

  // Fetch the stocktake INFO (header/footer/side-panel fields — NOT the lines).
  // A NodeError (e.g. bad id) is promoted to the global unexpected-error modal
  // via mapSuccessToError. Stocktake-LEVEL saves write back with `mutate` (no
  // refetch), but the Documents tab's upload/delete calls `refetchInfo` to
  // re-read the node's documents list — so `info` reads `.latest`
  // NON-suspending (kdd/solid-reactivity-pitfalls): a bare `data()` read would
  // re-suspend the <Suspense> below on every documents refetch and remount the
  // whole open detail view. `.latest` still suspends until the FIRST load
  // resolves, so the initial spinner is unchanged; a later refetch keeps the
  // previous node on screen while the fresh one lands.
  const [data, { mutate, refetch: refetchInfo }] = createResource(
    () => ({ storeId: params.storeId, stocktakeId: params.stocktakeId }),
    async variables => {
      const result = await graphqlFetch(StocktakeDetail, variables, {
        mapSuccessToError: d =>
          d.stocktake.__typename === 'NodeError'
            ? d.stocktake.error.description
            : undefined,
      });
      if (result.kind !== 'success') return undefined;
      return result.data.stocktake.__typename === 'StocktakeNode'
        ? result.data.stocktake
        : undefined;
    }
  );
  const info = (): StocktakeInfoFragment | undefined => data.latest;

  // The lines PAGE — a separate, server-filtered/sorted/paged query. Keyed on
  // the SERIALISED variables (a stable string) like the stocktakes LIST, so
  // identical query content doesn't refetch (kdd/solid-reactivity-pitfalls).
  // stripEmpty drops added-but-empty filter chips so an empty chip doesn't
  // reflash the list.
  const linesVariables = createMemo<StocktakeLinesVariables>(() => {
    const base = stripEmpty(query().filter);
    // "Show error lines": layer id.equalAny over the current wire filter from
    // the transient error set. Only when the flag is on AND ids are stamped —
    // an empty equalAny would match nothing, and after a reload (flag on, no
    // ids) we want the full list, so the id key is simply omitted then.
    const filter =
      query().showError && errorLineIds().length > 0
        ? { ...base, id: { equalAny: errorLineIds() } }
        : base;
    return {
      storeId: params.storeId,
      stocktakeId: params.stocktakeId,
      filter,
      sort: query().sort,
      page: { first: query().first, offset: query().offset },
    };
  });
  const [linesData, { refetch: refetchLines }] = createResource(
    () => JSON.stringify(linesVariables()),
    async serialised => {
      const result = await graphqlFetch(
        StocktakeLines,
        JSON.parse(serialised) as StocktakeLinesVariables
      );
      if (result.kind !== 'success') return undefined;
      return result.data.stocktakeLines;
    }
  );

  // Read `.latest` (non-suspending): during a refetch it returns the previous
  // page (keeps rows in place, no remount); undefined before the first load.
  const rows = (): Line[] => linesData.latest?.nodes ?? [];
  const totalCount = (): number => linesData.latest?.totalCount ?? 0;

  // Total volume of the selected lines (volumePerPack × counted|snapshot packs)
  // — feeds the change-location picker's "Available" filter so it keeps only
  // locations with room for the whole move.
  const selectedVolume = (): number => {
    const ids = new Set(selectedIds());
    return rows()
      .filter(r => ids.has(r.id))
      .reduce(
        (total, r) =>
          total +
          r.volumePerPack * (r.countedNumberOfPacks ?? r.snapshotNumberOfPacks),
        0
      );
  };

  // Locations WITH capacity for this store, fetched ONCE HERE (not from a
  // global cache) and passed down to the line editor + change-location picker,
  // so their % used / fullness filter reflect current stock. `volumeUsed` is
  // the sum of each stock line's volume in the location; a NEW stocktake's line
  // saves never move stock (stock movements happen only on finalise — verified
  // against the OMS `get_volume_used` service + the stocktake_line update
  // service, which upserts only the stocktake_line row). So capacity is static
  // for the stocktake's editable life and this is NOT refetched on line save.
  // The detail location FILTER also reads it (code/name only). Non-suspending
  // read via `.latest` so a refetch never trips the view's Suspense boundary.
  const [locationsData] = createResource(
    () => params.storeId,
    async storeId => {
      const result = await fetchLocationsWithVolume(storeId);
      return result;
    }
  );
  const locations = (): LocationWithVolume[] => locationsData.latest ?? [];

  // Finalise trims every uncounted line server-side, so the total can collapse
  // far below the page the user is on; a bulk delete does the same
  // (src/list/clampPageOffset.ts, issue #1117).
  clampPageOffset({
    total: () => settledTotal(linesData, page => page.totalCount),
    offset: () => query().offset,
    pageSize: () => query().first,
    setOffset: offset => setQuery({ ...query(), offset }),
  });

  // Refetch the current lines page after a save. Only the lines page: a line
  // save changes the count/line rows, never the location capacities (see
  // locationsData above).
  const refetchAfterSave = () => refetchLines();
  // Any in-flight lines fetch shows the loading treatment. Every refetch —
  // filter/sort/page navigation AND a post-save refetch — surfaces it so the
  // user always sees that something is happening (a slow network otherwise
  // looks frozen). The rows stay put across a refetch (keepPreviousData), so
  // with rows already showing this is the small toolbar spinner, not a blanked
  // table; only the very first load (no rows yet) uses the centred spinner.
  const tableLoading = () => linesData.loading;

  // Stale per-line errors are cleared ONLY when a successful line change
  // resolves them (onLinesChanged) — not on sort, filter, paging, or any fresh
  // page. Those navigations don't resolve an error, so the highlights and the
  // "show error lines" filter (which the errors filter reads its id set from)
  // survive them; a save is the one event that makes the errors stale. This
  // also avoids a feedback loop: showError refetches off the very error set in
  // lineErrors, so clearing on any page load would collapse the filter the
  // instant it applied.
  const clearLineErrors = () => setLineErrors(new Map());

  // No client-side "has counted lines" guard. The old best-effort check only
  // saw the CURRENT page (rows()), so a stocktake with placeholder lines on the
  // first page but counted lines further in was wrongly blocked from finalising
  // (issue #791). Finalise now always reaches the server, which is the source
  // of truth: it accepts an all-uncounted stocktake (a no-op) and rejects a
  // truly-empty one with NoLines, surfaced in the finalise-rejection dialog.

  // Header click: TanStack computed the next direction; record it as the
  // GraphQL sort array and reset to the first page. Sorting resolves no error,
  // so it keeps both the stamped errors and the errors filter — it just
  // reorders the (possibly error-filtered) lines.
  const onSort = (key: SortKey, desc: boolean) =>
    setQuery({ ...query(), sort: [{ key, desc }], offset: 0 });

  // A wire-filter change (item search / location) also keeps the errors and
  // the errors filter: the id.equalAny set layers with the new wire filter
  // (linesVariables merges them), so the two narrow together. Nothing is
  // resolved here either, so lineErrors stays.
  const onFilterChange = (next: StocktakeLineFilter) => {
    setQuery({ ...query(), filter: next, offset: 0 });
    setSelectedIds([]);
  };

  // Row click → open the editor on that line's ITEM (all its batches), passing
  // the clicked line id so the editor can scroll to / focus that batch. The
  // modal advances through the list itself via "OK & next".
  const openRow = (line: Line) =>
    setEditState({ itemId: line.item.id, lineId: line.id });

  // "Add item" (empty state + toolbar) → open the editor in the item-search
  // state (no initial item).
  const openAdd = () => setEditState({});

  // --- Stocktake-level saves (updateStocktake, spliced back with no refetch)
  // --

  const current = () => info();

  // Alt+N — this screen's add action (spec/keyboard KB-R2, AC-KB7). One
  // declaration for the two controls that trigger it (the toolbar button and the
  // ghost button in the table's empty slot); each carries `shortcut={ALT_N}` for
  // its badge, neither owns the action.
  //
  // Reads `current()` rather than the `node` the JSX binds: that one is a <Show>
  // render-prop accessor scoped inside the tree, while the action is declared at
  // component scope. Disabled while there is no stocktake yet, or once it is
  // finalised and there is nothing to add to — evaluated at keypress time, so no
  // re-registration when the status changes.
  createAddAction({
    name: 'button.add-item',
    run: openAdd,
    // Gated on `.state`, NOT on `current()` — which reads `data.latest`, and
    // `.latest` suspends on the first pending read (kdd/solid-reactivity-pitfalls
    // § no remounts). The command palette evaluates every action's `disabled()`
    // inside its own render, so a suspending read here would suspend THE PALETTE
    // whenever it was opened while this screen was still first-loading. An
    // action's `disabled` must never read a suspending source.
    disabled: () => {
      if (data.state !== 'ready' && data.state !== 'refreshing') return true;
      const stocktake = data.latest;
      return !stocktake || isDisabled(stocktake);
    },
  });

  // A stocktake-level field save: patch → updateStocktake, replace `info` in
  // place on success. No user-facing error branch — any rejection here is
  // unexpected (the UI disables the fields once the stocktake is
  // finalised/locked) and saveStocktakeFields has already routed it to the
  // global modal. The patch is a subset of UpdateStocktakeInput.
  const saveField = async (
    patch: Partial<Omit<UpdateStocktakeVariables['input'], 'id'>>
  ) => {
    const node = current();
    if (!node) return;
    const saved = await saveStocktakeFields(params.storeId, {
      id: node.id,
      ...patch,
    });
    if (saved)
      mutate((prev: StocktakeInfoNode | undefined) =>
        prev ? { ...prev, ...saved } : prev
      );
  };

  // ONE debounced-edit buffer for every as-you-type text field on the
  // stocktake (the toolbar's description + the side panel's counted-by /
  // verified-by / comment), owned here and passed whole to both children. One
  // buffer = coalescing spans the whole entity. Seeded from info() and
  // re-seeded when the stocktake identity changes; never re-hydrated from a
  // save result, so a returned node can't clobber in-progress typing.
  const edit = createDebouncedEdit<StocktakeEditFields>({
    id: () => current()?.id ?? '',
    initial: () => ({
      description: current()?.description ?? '',
      countedBy: current()?.countedBy ?? '',
      verifiedBy: current()?.verifiedBy ?? '',
      comment: current()?.comment ?? '',
    }),
    save: patch => void saveField(patch),
  });
  const setHold = (hold: boolean) => void saveField({ isLocked: hold });

  // Finalise is owned by FinaliseAction; on success it hands the saved node
  // back here, which we merge over the current node to reflect the FINALISED
  // state in place with no refetch. A finalise can change lines (it may zero
  // uncounted lines), so we also refetch the lines page.
  const onFinalised = (saved: StocktakeInfoFragment) => {
    mutate((prev: StocktakeInfoNode | undefined) =>
      prev ? { ...prev, ...saved } : prev
    );
    void refetchAfterSave();
  };

  // The record was deleted from the side panel's Actions → leave for the list.
  // `replace: true` drops the deleted stocktake's detail URL from history so
  // Back can't return to a now-missing record (it would only 404 / promote a
  // NodeError to the global modal).
  const onDeleted = () =>
    navigate(`/${params.storeId}/inventory/stocktakes`, { replace: true });

  // --- Selection actions + line-edit modal: refetch the page on any change ---
  // Each action (Delete / Change location / Reduce to 0) and the line-edit
  // modal report success; the view refetches the current lines page (no splice
  // — the small page is cheap, kdd/stocktake-line-editing). Errors still stamp
  // inline via stampErrors so the offending rows flag their error.

  // Stamp the per-line errors (lineId → typename) — drives the inline
  // Snapshot-cell message. An action/finalise calls this the moment a save
  // partially fails.
  const stampErrors = (errors: LineErrors) => setLineErrors(new Map(errors));

  // A line-level change committed (line-edit modal OR a selection action). We
  // refetch the current page rather than splice; the fresh page also clears
  // stale rows. Selection is cleared so the footer returns to the status view.
  //
  // A successful commit resolves whatever the errors were about → drop the
  // stale highlights and leave the errors view. Turning the errors filter off
  // changes the lines-query key (id.equalAny disappears), which by itself
  // triggers a reactive refetch to the now-unfiltered page — so on that path we
  // must NOT also call the manual refetch, or the page would fetch twice. When
  // the filter wasn't on, the key is unchanged and the manual refetch is the
  // only refresh.
  // `keepSelection` is for a PARTIAL commit (some lines saved, some rejected):
  // the selection footer OWNS the action dialogs, so dropping the selection
  // unmounts the very dialog that still has to report the outcome (issue
  // #1150). Holding it also leaves the user on the same selection to act on
  // what didn't save. The errors the action is about to stamp survive either
  // way — clearLineErrors runs here, the stamp lands after it, same tick.
  // (`_commit` is what the callers hand over; this view refetches the page
  // rather than splicing it in, per the comment above.)
  const onLinesChanged = (
    _commit?: LineEditCommit,
    opts?: { keepSelection?: boolean }
  ) => {
    if (!opts?.keepSelection) setSelectedIds([]);
    const wasFilteringErrors = query().showError && lineErrors().size > 0;
    clearLineErrors();
    if (wasFilteringErrors) {
      setQuery({ ...query(), showError: false }); // reactive refetch does it
      return;
    }
    void refetchAfterSave();
  };

  // "OK & next" (update mode) asks the parent for the next item to edit. We own
  // this (not the modal) because the list is server-paginated: the next item
  // may be on a later PAGE, and finding it means advancing the detail table
  // forward — the same as the user paging. Rules (see the behaviour matrix):
  //   1. Scan the CURRENT page's rows after the current item for the next
  //      distinct item not in `covered` (an item spans several batch rows).
  //   2. If none on this page and more pages exist, advance to the next page
  //      (offset += first — the table VISIBLY moves), fetch it, and rescan.
  //   3. Exhausted (no eligible item on any further page) → undefined; the
  //      modal then drops into add mode. The table stays on the last page.
  // `covered` is the modal's this-iteration set (items already stepped
  // through), passed in so a re-appearing item isn't offered twice, across
  // pages too.
  //
  // Pages beyond the first are fetched DIRECTLY (not via the reactive resource)
  // so the walk is race-free; we still setQuery(offset) so the visible table
  // follows along, and the resource refetches that page in the background.
  const nextItem = async (
    currentId: string,
    covered: Set<string>
  ): Promise<StocktakeLineEditItem | undefined> => {
    // Pick the next distinct, uncovered item within a page's rows. On the
    // CURRENT page we must start AFTER the current item's row (`fromStart` =
    // false): items before it are uncovered but already behind us, so a `past`
    // gate walks past the current item first. On later pages everything is
    // "after", so `fromStart` = true. An item spans several batch rows; the
    // covered set (which includes the current item) skips repeats.
    const pick = (
      pageRows: Line[],
      fromStart: boolean
    ): StocktakeLineEditItem | undefined => {
      let past = fromStart;
      for (const line of pageRows) {
        const id = line.item.id;
        if (id === currentId) {
          past = true; // now past the current item's rows
          continue;
        }
        if (!past || covered.has(id)) continue;
        return {
          id,
          code: line.item.code,
          name: line.itemName,
          isVaccine: line.item.isVaccine,
          doses: line.item.doses,
          unitName: line.item.unitName,
          defaultPackSize: line.item.defaultPackSize,
        };
      }
      return undefined;
    };

    // 1. The current page (already loaded) — scan only after the current item.
    const onThisPage = pick(rows(), false);
    if (onThisPage) return onThisPage;

    // 2/3. Walk forward a page at a time until we find one or run out. Later
    // pages scan from their top (fromStart), the covered set guarding repeats.
    let offset = query().offset;
    const first = query().first;
    for (;;) {
      offset += first;
      if (offset >= totalCount()) return undefined; // no further pages
      // Move the visible table to this page (the resource refetches it too).
      setQuery({ ...query(), offset });
      const result = await graphqlFetch(StocktakeLines, {
        storeId: params.storeId,
        stocktakeId: params.stocktakeId,
        filter: stripEmpty(query().filter),
        sort: query().sort,
        page: { first, offset },
      });
      if (result.kind !== 'success') return undefined;
      const found = pick(result.data.stocktakeLines.nodes, true);
      if (found) return found;
      // else keep advancing
    }
  };

  // "Show error lines" (from a failed finalise / bulk action's error dialog):
  // turn on the errors filter so the table narrows to just the stamped lines
  // (server id.equalAny — see linesVariables). Reset to the first page and
  // clear the selection so the footer returns to the status view. A no-op when
  // nothing is stamped (the dialog only offers it when there are error lines).
  const showErrors = () => {
    setSelectedIds([]);
    if (!hasErrors()) return;
    setQuery({ ...query(), showError: true, offset: 0 });
  };

  // Crumbs are an accessor so t() re-translates on locale change.
  const crumbs = (node: StocktakeInfoFragment) => [
    {
      label: t('stocktakes'),
      onClick: () => navigate(`/${params.storeId}/inventory/stocktakes`),
    },
    { label: String(node.stocktakeNumber) },
  ];

  // Store-preference display gates (spec/stocktakes › store-preference gates).
  // Read reactively so a post-sync context refetch re-gates in place. A gated
  // column is built into the array only when its preference is on — absent
  // entirely otherwise (not merely default-hidden).
  const prefs = () => stocktakePreferences();

  // Blind stocktake (spec/stocktakes › store-preference gates): Snapshot and
  // Difference hide only while counting (status NEW) and reappear once
  // finalised; Reason hides for the stocktake's whole life, since no reason
  // is ever required under this preference.
  const hideSnapshotStock = () =>
    prefs().blindStocktake && current()?.status === 'NEW';
  const hideReason = () => prefs().blindStocktake;

  // A memo, not a plain function: read as a JSX prop (DataTable's `columns`),
  // it would otherwise rebuild a fresh array + fresh column objects on EVERY
  // read. TanStack Table treats a new columns identity as a config change and
  // updates its internal state accordingly, which re-triggers this prop's
  // reactive scope — a self-sustaining loop with no real dependency change
  // behind it (this caused a genuine slow-load bug; root-caused via targeted
  // logging that confirmed every actual dependency stayed unchanged across
  // dozens of re-fires per second).
  const columns = createMemo((): Column<Line, SortKey, GroupKey>[] => [
    {
      // Column id is the e2e/TESTIDS.md contract's `item.code` (the accessor
      // path); the server sort key is `itemCode`.
      c: { accessor: line => line.item.code, id: 'item.code' },
      sortKey: 'itemCode',
      header: () => t('label.code'),
      cardGroup: 'more',
      // Sized as the shared `itemCode` column (the `code` cell kind: 5rem off a
      // ~9-char measure, capped at 7, monospace so digits align down the
      // column). It was carrying no definition at all, so it auto-sized to
      // whatever the widest code on the page happened to be and moved as the
      // user paged. Any change to what a code column is worth belongs in
      // _globalColumnConfig.ts, which is the one place those widths are tuned —
      // not here.
      ...getCellDefinition('itemCode'),
    },
    {
      c: { key: 'itemName' },
      sortKey: 'itemName',
      header: () => t('label.name'),
      // The shared `itemName` definition: the `text` kind's 18.75rem, and
      // deliberately NO growth cap, which is what makes this the column that
      // absorbs the table's slack — the right behaviour for the longest value in
      // the row ("ABACAVIR / LAMIVUDINE 120/60 mg comp disp. BTE/30").
      // Item names are long — allow up to two wrapped lines before clamping.
      ...getCellDefinition('itemName', {
        headerPosition: 'primary',
        wrapLines: 2,
      }),
    },
    {
      c: { key: 'batch' },
      sortKey: 'batch',
      header: () => t('label.batch'),
      cardGroup: 'more',
      ...getCellDefinition('batch'),
    },
    {
      c: { key: 'expiryDate' },
      sortKey: 'expiryDate',
      header: () => t('label.expiry-date'),
      cardGroup: 'more',
      ...getExpiryDateCell(),
    },
    {
      c: { key: 'manufactureDate' },
      // Unsortable — StocktakeLineSortFieldInput has no manufactureDate key
      // (backend gap; spec/stocktakes contract § backend gaps).
      header: () => t('label.manufacture-date'),
      cardGroup: 'more',
      ...getDateCell(),
    },
    {
      // Location is nested (location.code) — an accessor column. Server sorts
      // by locationCode.
      c: { accessor: line => line.location?.code ?? '', id: 'location' },
      sortKey: 'locationCode',
      header: () => t('label.location'),
      cardGroup: 'more',
      // `location`, not `locationCode`: this renders the code but its header is
      // "Location", and that key's 6.5rem is the one measured against it.
      ...getCellDefinition('location'),
    },
    {
      // Unit name (item.unitName) — read-only. Unsortable (no server key;
      // backend gap). Matches OMS's columns.tsx itemUnit, placed after
      // Location.
      c: { accessor: line => line.item.unitName ?? '', id: 'itemUnit' },
      header: () => t('label.unit-name'),
      cardGroup: 'more',
      ...getCellDefinition('unitName'),
    },
    {
      c: { key: 'packSize' },
      // Unsortable in OMS's columns.tsx (no enableSorting) even though the
      // server has a packSize key — matched here.
      header: () => t('label.pack-size'),
      cardGroup: 'more',
      ...getCellDefinition('packSize'),
    },
    // Doses per unit (gated by manageVaccinesInDoses) — packSize × item.doses,
    // vaccine rows only.
    ...(prefs().manageVaccinesInDoses
      ? [
          {
            c: {
              accessor: line => dosesPerUnit(line) ?? '',
              id: 'dosesPerUnit',
            },
            header: () => t('label.doses-per-unit'),
            cardGroup: 'more',
            ...getCellDefinition('dosesPerUnit'),
          } satisfies Column<Line, SortKey, GroupKey>,
        ]
      : []),
    // Snapshot — omitted entirely while counting under blind stocktake
    // (reappears once finalised; see hideSnapshotStock above).
    ...(hideSnapshotStock()
      ? []
      : [
          {
            c: { key: 'snapshotNumberOfPacks' },
            sortKey: 'snapshotNumberOfPacks',
            header: () => t('label.snapshot-num-of-packs'),
            cardGroup: 'more',
            ...getCellDefinition('snapshotNumberOfPacks'),
            // Snapshot cell also carries the line's error beneath the count (a
            // snapshot/current-count mismatch is a "recount this line" message
            // about the snapshot); the count itself formats like every other
            // number column.
            cell: info => {
              const value = info.getValue<number | null | undefined>();
              return (
                <>
                  {formatNumber(value, { maximumFractionDigits: 2 })}
                  <Show
                    when={
                      lineErrors().get(info.row.original.id) ===
                      'SnapshotCountCurrentCountMismatchLine'
                    }
                  >
                    <span class={styles.lineError}>
                      {t('error.snapshot-total-mismatch')}
                    </span>
                  </Show>
                </>
              );
            },
          } satisfies Column<Line, SortKey, GroupKey>,
        ]),
    {
      c: { key: 'countedNumberOfPacks' },
      sortKey: 'countedNumberOfPacks',
      header: () => t('label.counted-num-of-packs'),
      // NOT user-hideable (hideFromColumnSettings), unlike the other data
      // columns here: this cell carries the WORD behind the uncounted marking
      // ("Not counted", below), and the tint and bar beside it are colour.
      // Hide the column from the Columns popover and an uncounted row would be
      // marked by colour alone — the one thing the marking is never allowed to
      // be (styling principle 9 / WCAG 1.4.1). Same reasoning as the outbound
      // line table's Batch column, which holds "Unallocated". The column stays
      // sortable and stays in its place in the order; it just can't be
      // switched off.
      ...getCellDefinition('countedNumberOfPacks', {
        align: 'right',
        headerPosition: 'badge',
        hideFromColumnSettings: true,
      }),
      // An uncounted line has no counted value, and a blank cell says nothing —
      // it reads as "zero" or "still loading" as readily as "not counted yet",
      // and it is the only cell that could carry the word the row's marking
      // leans on. The absent-value treatment types it as prose (UI face,
      // italic, muted) so it cannot be mistaken for a counted quantity.
      //
      // A word, not a chip: the row already carries the unfinished tint AND the
      // leading bar, so nothing more is needed to FIND it. This cell's one job
      // is to say WHICH value is missing.
      //
      // The accessor above keeps the raw number as the cell's VALUE, so
      // sorting, the hover-reveal and any export are unchanged.
      cell: info =>
        isUncounted(info.row.original) ? (
          <AbsentValue label={t('label.not-counted')} />
        ) : (
          formatNumber(info.getValue<number | null | undefined>(), {
            maximumFractionDigits: 2,
          })
        ),
    },
    // Doses counted (gated by manageVaccinesInDoses) — client-side, vaccine
    // rows only (blank otherwise); nothing stored per line (see ./lines/doses).
    ...(prefs().manageVaccinesInDoses
      ? [
          {
            c: {
              accessor: line => dosesCounted(line) ?? '',
              id: 'dosesCounted',
            },
            header: () => t('label.doses-counted'),
            cardGroup: 'more',
            ...getCellDefinition('doses'),
          } satisfies Column<Line, SortKey, GroupKey>,
        ]
      : []),
    // Difference = counted − snapshot; blank until the line is counted. Derived
    // (no server field), so unsortable. Omitted alongside Snapshot under blind
    // stocktake (same gate — see hideSnapshotStock above).
    ...(hideSnapshotStock()
      ? []
      : [
          {
            c: {
              accessor: line => lineDifference(line) ?? '',
              id: 'difference',
            },
            header: () => t('label.difference'),
            cardGroup: 'more',
            ...getCellDefinition('difference'),
          } satisfies Column<Line, SortKey, GroupKey>,
        ]),
    // Tail columns in OMS's columns.tsx order: Reason · [Donor] · Manufacturer
    // · Campaign · Comment. No price columns — Sell/Cost price live only in the
    // line editor's Pricing tab, never as detail-table columns (spec S3).
    // Reason — omitted for the stocktake's whole life under blind stocktake,
    // since no reason is ever required (see hideReason above).
    ...(hideReason()
      ? []
      : [
          {
            // The adjustment reason (reasonOption.reason) — an accessor column.
            // Server sorts by reasonOption.
            c: {
              accessor: line => line.reasonOption?.reason ?? '',
              id: 'reason',
            },
            sortKey: 'reasonOption',
            header: () => t('label.reason'),
            cardGroup: 'more',
          } satisfies Column<Line, SortKey, GroupKey>,
        ]),
    // Donor (gated by allowTrackingOfStockByDonor) — donorName is a plain
    // scalar on the line. Unsortable: StocktakeLineSortFieldInput has no donor
    // key, so no sortKey (server can't sort it — kdd/type-safety, D23).
    ...(prefs().allowTrackingOfStockByDonor
      ? [
          {
            c: { accessor: line => line.donorName ?? '', id: 'donor' },
            header: () => t('label.donor'),
            cardGroup: 'more',
            ...getCellDefinition('donor'),
          } satisfies Column<Line, SortKey, GroupKey>,
        ]
      : []),
    {
      // Manufacturer name (ungated) — the arg-bearing manufacturer(storeId)
      // field, resolved to its name. Unsortable (no server key).
      c: {
        accessor: line => line.manufacturer?.name ?? '',
        id: 'manufacturer',
      },
      header: () => t('label.manufacturer'),
      cardGroup: 'more',
    },
    {
      // Campaign name (ungated) — campaign.name on the line. Unsortable (no
      // server key; backend gap). Matches OMS's columns.tsx campaign, placed
      // after Manufacturer, before Comment.
      c: { accessor: line => line.campaign?.name ?? '', id: 'campaign' },
      header: () => t('label.campaign-only'),
      cardGroup: 'more',
      ...getCellDefinition('campaign'),
    },
    // Comment (spec column #18) — the line's own comment text. Distinct from
    // note; the shared comment cell (indicator + popover).
    {
      c: { key: 'comment' },
      header: () => <CommentHeader />,
      cardGroup: 'more',
      ...getCellDefinition('comment'),
    },
  ]);

  return (
    // Local Suspense boundary: the FIRST read of info() (data.latest) suspends
    // until the info fetch lands. Catching it here keeps first-load from
    // tripping the section fallback and remounting the view
    // (kdd/solid-reactivity-pitfalls). Later reads are non-suspending — a
    // stocktake-level save is a mutate() (never suspends) and a Documents-tab
    // refetch reads through `.latest` (previous node stays on screen) — so this
    // fallback shows only on the initial info fetch. The lines resource is
    // likewise read non-suspending (.latest), so a lines refetch never trips
    // it.
    <Suspense fallback={<Spinner center />}>
      {/* NON-keyed Show: the subtree stays mounted while info() is truthy — a
          keyed Show would tear down + rebuild on every stocktake-level save
          (fresh node object), dropping focus from the field being typed. */}
      <Show when={info()}>
        {node => (
          // The <Tabs> root wraps the whole Page from outside (display:
          // contents, so it adds no layout box): the TabList lives in the
          // Header, the TabPanels in the body, and both share this one tabs
          // context.
          <Tabs value={activeTab()} onValueChange={setActiveTab}>
            <Page
              fillBody
              sidePanelOpen={sidePanelOpen()}
              sidePanelTitle={t('heading.details')}
              onSidePanelClose={() => setSidePanelOpen(false)}
              sidePanelContent={
                <StocktakeSidePanel
                  storeId={params.storeId}
                  node={node()}
                  disabled={isDisabled(node())}
                  edit={edit}
                  onDeleted={onDeleted}
                />
              }
              header={
                <Header>
                  <Breadcrumb crumbs={crumbs(node())} />
                  <HeaderButtons>
                    {/* "Add item" — opens the line-edit modal in the item-search
                    state. Only while the stocktake is editable. */}
                    <Show when={!isDisabled(node())}>
                      <Button
                        icon={<PlusCircleIcon />}
                        shortcut={ALT_N}
                        onClick={openAdd}
                      >
                        {t('button.add-item')}
                      </Button>
                    </Show>
                    {/* Export/Print — always available (unlike Add item, it
                      does not depend on editability): print/export a report of
                      this stocktake, respecting the line table's current sort
                      (spec/stocktakes S3 → spec/reports S4). */}
                    <ExportPrintAction
                      stocktakeId={node().id}
                      sort={reportSort()}
                    />
                    {/* More — the closed-panel reopen affordance, at the end of
                      the app-bar page-action cluster (spec ui-standards/
                      layout.md → page regions). Shows ONLY while the panel is
                      closed; uses the sidebar glyph (not the info icon), and
                      reopening counts as the user's explicit open choice. */}
                    <Show when={!sidePanelOpen()}>
                      <Button
                        variant="secondary"
                        icon={<SidebarIcon />}
                        data-testid="open-detail-panel-button"
                        // createSidePanelOpen registers Alt+M; this is the
                        // control that advertises it (ui-surface S2).
                        shortcut={ALT_M}
                        onClick={() => setSidePanelOpen(true)}
                      >
                        {t('button.more')}
                      </Button>
                    </Show>
                  </HeaderButtons>
                  <StocktakeDetailToolbar
                    node={node()}
                    disabled={isDisabled(node())}
                    edit={edit}
                  />
                  {/* Last child of the Header → the tab strip claims its bottom
                  edge (Header.module.css / Tabs). Details + Log. */}
                  <TabList tabs={tabs()} />
                </Header>
              }
              contentFooter={
                // Selection action bar while lines are selected; otherwise the
                // stocktake status footer (on-hold / stepper / finalise).
                // Matches OMS, which swaps the whole footer on selection.
                // Pagination is NOT here anymore — it's overlaid inside the
                // DataTable.
                <Show
                  when={selectedIds().length > 0}
                  fallback={
                    <StocktakeStatusFooter
                      storeId={params.storeId}
                      node={node()}
                      disabled={isDisabled(node())}
                      pagination={linePagination()}
                      onSetHold={setHold}
                      onFinalised={onFinalised}
                      onError={lineIds =>
                        stampErrors(
                          new Map(
                            lineIds.map(id => [
                              id,
                              'SnapshotCountCurrentCountMismatchLine',
                            ])
                          )
                        )
                      }
                      onShowErrors={showErrors}
                    />
                  }
                >
                  <ContentFooter>
                    <strong data-testid="selected-rows-count">
                      {selectedIds().length} {t('label.selected')}
                    </strong>
                    {/* Each action owns its own button + confirm/working/success/
                    error modal + run; the view supplies storeId/selection and
                    refetches the page on any commit (onCommit → onLinesChanged),
                    stamps failed lines inline (onError), and clears selection on
                    the error phase's "Show error lines" (onShowErrors). */}
                    <DeleteLinesAction
                      storeId={params.storeId}
                      selectedIds={selectedIds}
                      disabled={isDisabled(node())}
                      onCommit={onLinesChanged}
                      onError={stampErrors}
                      onShowErrors={showErrors}
                    />
                    <ChangeLocationAction
                      storeId={params.storeId}
                      selectedIds={selectedIds}
                      disabled={isDisabled(node())}
                      locations={locations()}
                      requiredVolume={selectedVolume}
                      onCommit={onLinesChanged}
                      onError={stampErrors}
                      onShowErrors={showErrors}
                    />
                    <ReduceToZeroAction
                      storeId={params.storeId}
                      selectedIds={selectedIds}
                      disabled={isDisabled(node())}
                      hideReason={hideReason()}
                      onCommit={onLinesChanged}
                      onError={stampErrors}
                      onShowErrors={showErrors}
                    />
                    {/* The pager rides the selection face as well: ticking a
                        row must not strip the way to the rest of the lines. */}
                    <Pagination {...linePagination()} inBar />
                    <ContentFooterActions>
                      <Button
                        variant="secondary"
                        icon={<MinusCircleIcon />}
                        onClick={() => setSelectedIds([])}
                      >
                        {t('label.clear-selection')}
                      </Button>
                    </ContentFooterActions>
                  </ContentFooter>
                </Show>
              }
            >
              {/* Details tab: the read-only, server-paginated line table (S3). */}
              <TabPanel value="details">
                <DataTable
                  columns={columns()}
                  cardGroups={CARD_GROUPS}
                  rows={rows()}
                  rowKey={line => line.id}
                  // Filters live in the table's own toolbar (ui-standards §
                  // tables → filtering), never the page header.
                  filters={
                    <StocktakeLineFilters
                      filter={filter()}
                      onFilterChange={onFilterChange}
                      locations={locations()}
                      showError={query().showError}
                      errorCount={lineErrors().size}
                      onShowErrorChange={on =>
                        setQuery({
                          ...query(),
                          showError: on,
                          offset: 0,
                        })
                      }
                    />
                  }
                  // Non-suspending loading read — every refetch (filter/sort/
                  // page navigation AND a post-save refetch) keeps the rows and
                  // shows the DataTable's loading treatment, so a slow network
                  // never looks frozen. With rows already showing that's the
                  // small toolbar spinner; the first load (no rows yet) is the
                  // centred spinner.
                  loading={tableLoading()}
                  sort={currentSort()}
                  onSort={onSort}
                  onRowClick={isDisabled(node()) ? undefined : openRow}
                  // Uncounted lines (no counted value) carry the unfinished-
                  // work marking — the teal row tint AND a bar of the same
                  // colour down the row's leading edge (spec ui-surface → Line
                  // table, OMS-REG-INV-03.68). One channel, one question —
                  // "what is still to count?" — answered by running the eye
                  // down one edge rather than reading every Counted cell. These
                  // are the lines trimmed on finalise. Flat table, so a
                  // leaf-row predicate is enough (no grouped parents to
                  // propagate to).
                  //
                  // This replaces the earlier whole-row action-blue TEXT tone:
                  // blue text is the colour row SELECTION already spends, it
                  // recoloured every value in the row (so a counted-looking
                  // number and a missing one differed only in hue), and it left
                  // the at-a-glance channel — the row background — unused. The
                  // shared marking is the outbound line table's, same tokens
                  // and same CSS (kdd/ui-styling; --marking-unfinished).
                  rowTint={line =>
                    isUncounted(line) ? 'unfinished' : undefined
                  }
                  // Same predicate on both channels: the tint colours the row,
                  // the bar makes the uncounted lines legible down one edge as
                  // the user scrolls a long count.
                  rowAccent={line =>
                    isUncounted(line) ? 'unfinished' : undefined
                  }
                  // Cards have neither a row background nor a leading edge to
                  // mark, so they keep the TEXT tone on the card's identity
                  // title (the teal is a 3:1 graphic colour — below the 4.5:1
                  // text floor — so it can't cross over to text). The word is
                  // there too: the Counted field is the card's badge.
                  cardTone={line => (isUncounted(line) ? 'info' : undefined)}
                  emptyMessage={t('error.no-stocktake-items')}
                  empty={
                    isDisabled(node()) ? undefined : (
                      <Button
                        variant="ghost"
                        shortcut={ALT_N}
                        data-testid="add-item-button"
                        onClick={openAdd}
                      >
                        {t('button.add-item')}
                      </Button>
                    )
                  }
                  enableSelection
                  selectedIds={selectedIds()}
                  onSelectionChange={setSelectedIds}
                  config={tableConfig.config()}
                  setConfig={tableConfig.setConfig}
                  // Central-server admins can promote this table's layout to
                  // the shared install-wide default (same gate as the list).
                  // Gate + action both off the config controller; undefined for
                  // everyone else, so the action isn't offered.
                  onSaveGlobalDefault={
                    tableConfig.canSaveGlobalDefault()
                      ? tableConfig.saveGlobalTableConfig
                      : undefined
                  }
                />
              </TabPanel>
              {/* Documents tab: files attached to this stocktake (OMS parity).
              Reads the node's `documents` list; upload/delete go through the
              REST sync-file store and re-read the node (refetchInfo) so the
              list reflects. Available on any status — documents sit outside the
              stocktake lifecycle gate. */}
              <TabPanel value="documents">
                <StocktakeDocumentsTab
                  storeId={params.storeId}
                  node={node()}
                  onChanged={() => void refetchInfo()}
                />
              </TabPanel>
              {/* Log tab: the stocktake's activity log — its own query (OMS
              parity), mounted only while this tab is active (Kobalte unmounts
              inactive panels), so it fetches on first visit. */}
              <TabPanel value="log">
                <ActivityLogPanel
                  storeId={params.storeId}
                  recordId={node().id}
                />
              </TabPanel>
              {/* The line-edit modal is an overlay, not tab content: it stays a
              direct child of the Page so a row-click on Details opens it
              regardless of which tab last had focus. */}
              <StocktakeLineEditModal
                open={editState() != null}
                onClose={() => setEditState(undefined)}
                storeId={params.storeId}
                stocktakeId={node().id}
                initialItemId={editState()?.itemId}
                initialLineId={editState()?.lineId}
                locations={locations()}
                locationsLoading={locationsData.loading}
                nextItem={nextItem}
                onSaved={onLinesChanged}
              />
            </Page>
          </Tabs>
        )}
      </Show>
    </Suspense>
  );
};

export default StocktakeDetailView;
