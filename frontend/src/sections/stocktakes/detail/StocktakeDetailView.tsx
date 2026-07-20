import {
  createEffect,
  createMemo,
  createResource,
  createSignal,
  on,
  Show,
  Suspense,
} from 'solid-js';
import type { Component } from 'solid-js';
import { useNavigate, useParams } from '@solidjs/router';
import { graphqlFetch } from '../../../api/graphql';
import { t } from '../../../intl';
import { Page } from '../../../ui/layout/Page/Page';
import { Header } from '../../../ui/layout/Header/Header';
import { Breadcrumb } from '../../../ui/layout/Header/Breadcrumb';
import { HeaderButtons } from '../../../ui/layout/Header/HeaderButtons';
import { Toolbar } from '../../../ui/layout/Header/Toolbar';
import { ContentFooter } from '../../../ui/layout/ContentFooter/ContentFooter';
import { ContentFooterActions } from '../../../ui/layout/ContentFooter/ContentFooterActions';
import { Button } from '../../../ui/elements/buttons/Button';
import { Spinner } from '../../../ui/elements/feedback/Spinner';
import { InfoIcon, MinusCircleIcon, PlusCircleIcon } from '../../../ui/icons';
import {
  DataTable,
  type Column,
  type SortState,
} from '../../../ui/elements/table/DataTable';
import {
  getDateCell,
  getNumberCell,
} from '../../../ui/elements/table/tableHelpers';
import { createTableConfig } from '../../../api/createTableConfig';
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
import { StocktakeSidePanel } from './StocktakeSidePanel';
import {
  DeleteLinesAction,
  ChangeLocationAction,
  ReduceToZeroAction,
} from './actions';
import { saveStocktakeFields } from './stocktakeUpdate';
import type { LineErrors } from './lines/stocktakeLineErrors';
import type { StocktakeLineFilter } from './stocktakeLineFilter';
import { createDebouncedEdit } from '../../../domain/debouncedEdit';
import {
  fetchLocationsWithVolume,
  type LocationWithVolume,
} from '../../../domain/location';
import type { StocktakeEditFields } from './stocktakeEdit';
import { useUrlQueryState } from '../../../list/urlQueryState';
import { stripEmpty } from '../../../typeHelpers';

// The stocktake detail view. The page shell (breadcrumb back to the list + an
// editable description + filters), the lines in a SERVER-paginated DataTable
// (server sorted / filtered / paged), an Additional-info side panel, and the
// stocktake-level status footer (on-hold / finalise). Clicking a row opens the
// line-edit modal; a save REFETCHES the current lines page (kdd/stocktake-line-
// editing — the small page is cheap to re-pull, so we don't splice mutation
// results in place anymore).
//
// TWO independent queries (kdd/stocktake-line-editing): `info` (stocktakeDetail,
// the header/footer/side-panel fields) and `lines` (stocktakeLines, one
// server-filtered/sorted page). A stocktake-LEVEL save mutates `info` in place
// (a single node, no pagination); a LINE save refetches only the `lines` page.
//
// A finalised or on-hold (locked) stocktake is read-only (OMS
// isStocktakeDisabled): row-click, the description/side-panel fields, and
// Finalise are all disabled; on-hold can still be lifted.

type Line = StocktakeLineFragment;

// The `info` resource's element type — the stocktakeDetail response narrowed to
// its success member ({ __typename: 'StocktakeNode' } & StocktakeInfoFragment).
// `mutate` callbacks are typed to this (spreading a saved StocktakeInfo fragment
// over it keeps __typename).
type StocktakeInfoNode = Extract<
  StocktakeDetailResult['stocktake'],
  { __typename: 'StocktakeNode' }
>;

// The server sort-field union (from codegen) — a column can only ever name a
// real server sort key (kdd/type-safety). Columns whose data the server can't
// sort on (prices, manufacture date, note, comment) simply omit `sortKey`.
type SortKey = NonNullable<StocktakeLinesVariables['sort']>[number]['key'];

// A finalised or on-hold (locked) stocktake can't have its content edited (OMS
// isStocktakeDisabled).
const isDisabled = (node: StocktakeInfoFragment) =>
  node.status !== 'NEW' || node.isLocked;

const DEFAULT_PAGE_SIZE = 20;

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
};

const DEFAULT_URL_STATE: DetailUrlState = {
  filter: {},
  // Default sort: item name ascending (matches OMS's default line order).
  sort: [{ key: 'itemName', desc: false }],
  offset: 0,
  first: DEFAULT_PAGE_SIZE,
};

const StocktakeDetailView: Component = () => {
  const params = useParams<{ storeId: string; stocktakeId: string }>();
  const navigate = useNavigate();
  // Filter + sort + pagination are URL-backed (shareable, survive reload/back-
  // nav) in one `?query=` param. Thin accessors over that single query.
  const { query, setQuery } =
    useUrlQueryState<DetailUrlState>(DEFAULT_URL_STATE);
  const filter = () => query().filter;
  const currentSort = (): SortState<SortKey> | undefined => {
    const s = query().sort[0];
    return s ? { key: s.key, desc: s.desc ?? false } : undefined;
  };

  const [selectedIds, setSelectedIds] = createSignal<string[]>([]);
  // The details panel is an overlay — it starts CLOSED (like OMS) and the
  // header info button opens it; its own close button (top inline-end) or the
  // toggle closes it.
  const [sidePanelOpen, setSidePanelOpen] = createSignal(false);
  // Per-line errors from the last failed finalise/bulk action, keyed by line
  // id → the error's __typename (the shared LineErrors shape, kept raw). The
  // Snapshot column renders it inline; cleared when a fresh page lands.
  const [lineErrors, setLineErrors] = createSignal<LineErrors>(new Map());
  // Column config (order/sizing/visibility) persists per user/store. The extra
  // editable columns start HIDDEN by default so the table isn't overwhelming —
  // the user reveals them via the column-visibility settings.
  const tableConfig = createTableConfig({
    tableId: 'stocktake-detail',
    defaultConfig: {
      base: {
        columnVisibility: {
          packSize: false,
          sellPricePerPack: false,
          costPricePerPack: false,
          manufactureDate: false,
          location: false,
          reason: false,
          note: false,
        },
      },
    },
  });
  // The line-edit modal's open state (undefined = closed). The modal
  // self-queries its own data (its item's stocktake lines + stock lines), so we
  // only tell it WHICH item to open on (or none, in the item-search state):
  // - { itemId }: opened from a ROW click — starts editing that item, and can
  //   step through the list via "OK & next" (it pages the server itself).
  // - {}: opened from "Add item" — starts in the item-search state.
  type EditState = { itemId?: string } | undefined;
  const [editState, setEditState] = createSignal<EditState>();

  // Fetch the stocktake INFO (header/footer/side-panel fields — NOT the lines).
  // A NodeError (e.g. bad id) is promoted to the global unexpected-error modal
  // via mapSuccessToError. Stocktake-LEVEL saves write back with `mutate` (no
  // refetch), so `info` is an accessor over data().
  const [data, { mutate }] = createResource(
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
  const info = (): StocktakeInfoFragment | undefined => data();

  // The lines PAGE — a separate, server-filtered/sorted/paged query. Keyed on
  // the SERIALISED variables (a stable string) like the stocktakes LIST, so
  // identical query content doesn't refetch (kdd/solid-reactivity-pitfalls).
  // stripEmpty drops added-but-empty filter chips so an empty chip doesn't
  // reflash the list.
  const linesVariables = createMemo<StocktakeLinesVariables>(() => ({
    storeId: params.storeId,
    stocktakeId: params.stocktakeId,
    filter: stripEmpty(query().filter),
    sort: query().sort,
    page: { first: query().first, offset: query().offset },
  }));
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

  // Locations WITH capacity for this store, fetched HERE (not from a global
  // cache) and passed down to the line editor + change-location picker, so their
  // % used / fullness filter reflect current stock. `volumeUsed` is
  // server-computed and shifts whenever a count commits stock into/out of a
  // location, so this is REFETCHED after every line save (see refetchAfterSave).
  // The detail location FILTER also reads it (code/name only). Non-suspending
  // read via `.latest` so a refetch never trips the view's Suspense boundary.
  const [locationsData, { refetch: refetchLocations }] = createResource(
    () => params.storeId,
    fetchLocationsWithVolume
  );
  const locations = (): LocationWithVolume[] => locationsData.latest ?? [];

  // A save-triggered refetch is SILENT — no refreshing bar (the table stays put
  // while the fresh page swaps in). A user-navigation refetch (filter/sort/page)
  // shows the bar as usual. `silentRefetching` is raised around a save refetch
  // and drives the DataTable's `loading` gate below.
  const [silentRefetching, setSilentRefetching] = createSignal(false);
  const refetchAfterSave = async () => {
    setSilentRefetching(true);
    try {
      // Refetch the lines page AND the location capacities together: a save may
      // have moved stock between locations (changing volumeUsed) or edited a
      // line's volume, so the picker's % used / fullness must be re-read.
      await Promise.all([refetchLines(), refetchLocations()]);
    } finally {
      setSilentRefetching(false);
    }
  };
  // Show the loading treatment only for a genuine (user-navigation) fetch — not
  // a post-save refetch.
  const tableLoading = () => linesData.loading && !silentRefetching();

  // A fresh lines page clears stale per-line errors. lineErrors is independently
  // stamped by save failures, so it stays its own signal — this effect only
  // resets it when a new page lands.
  createEffect(on(linesData, () => setLineErrors(new Map())));

  // A stocktake can be finalised only when it has at least one counted line
  // (OMS no-lines guard). Best-effort over the CURRENT page — a fuller guard
  // would need a server count; the finalise mutation is the source of truth.
  const canFinalise = () =>
    rows().some(line => line.countedNumberOfPacks != null);

  // Header click: TanStack computed the next direction; record it as the
  // GraphQL sort array and reset to the first page.
  const onSort = (key: SortKey, desc: boolean) =>
    setQuery({ ...query(), sort: [{ key, desc }], offset: 0 });

  const onFilterChange = (next: StocktakeLineFilter) => {
    setQuery({ ...query(), filter: next, offset: 0 });
    setSelectedIds([]);
  };

  // Row click → open the editor on that line's ITEM (all its batches). The
  // modal advances through the list itself via "OK & next".
  const openRow = (line: Line) => setEditState({ itemId: line.item.id });

  // "Add item" (empty state + toolbar) → open the editor in the item-search
  // state (no initial item).
  const openAdd = () => setEditState({});

  // --- Stocktake-level saves (updateStocktake, spliced back with no refetch) --

  const current = () => info();

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
  // re-seeded when the stocktake identity changes; never re-hydrated from a save
  // result, so a returned node can't clobber in-progress typing.
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

  // --- Selection actions + line-edit modal: refetch the page on any change ---
  // Each action (Delete / Change location / Reduce to 0) and the line-edit modal
  // report success; the view refetches the current lines page (no splice — the
  // small page is cheap, kdd/stocktake-line-editing). Errors still stamp inline
  // via stampErrors so the offending rows flag their error.

  // Stamp the per-line errors (lineId → typename) — drives the inline
  // Snapshot-cell message. An action/finalise calls this the moment a save
  // partially fails.
  const stampErrors = (errors: LineErrors) => setLineErrors(new Map(errors));

  // A line-level change committed (line-edit modal OR a selection action). We
  // refetch the current page rather than splice; the fresh page also clears
  // stale rows. Selection is cleared so the footer returns to the status view.
  const onLinesChanged = () => {
    setSelectedIds([]);
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
        return { id, code: line.item.code, name: line.itemName };
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

  // "Show error lines" — TODO: the old client-side errors-only filter is gone
  // (the server can't filter by an arbitrary id list yet — see
  // stocktakeDetailFilters.tsx). For now this just clears the selection so the
  // footer returns to the status view; the error lines already flag inline via
  // stampErrors.
  const showErrors = () => setSelectedIds([]);

  // Crumbs are an accessor so t() re-translates on locale change.
  const crumbs = (node: StocktakeInfoFragment) => [
    { label: t('inventory') },
    {
      label: t('stocktakes'),
      onClick: () => navigate(`/${params.storeId}/inventory/stocktakes`),
    },
    { label: String(node.stocktakeNumber) },
  ];

  const columns = (): Column<Line, SortKey>[] => [
    {
      // Column id is the e2e/TESTIDS.md contract's `item.code` (the accessor
      // path); the server sort key is `itemCode`.
      c: { accessor: line => line.item.code, id: 'item.code' },
      sortKey: 'itemCode',
      header: t('label.code'),
    },
    {
      c: { key: 'itemName' },
      sortKey: 'itemName',
      header: t('label.name'),
      // Item names are long — allow up to two wrapped lines before clamping.
      meta: { card: { region: 'primary' }, wrapLines: 2 },
    },
    {
      c: { key: 'batch' },
      sortKey: 'batch',
      header: t('label.batch'),
    },
    {
      c: { key: 'expiryDate' },
      sortKey: 'expiryDate',
      header: t('label.expiry-date'),
      ...getDateCell(),
    },
    {
      c: { key: 'snapshotNumberOfPacks' },
      sortKey: 'snapshotNumberOfPacks',
      header: t('label.snapshot-num-of-packs'),
      ...getNumberCell(),
      // Snapshot cell also carries the line's error inline beneath the count (a
      // snapshot/current-count mismatch is a "recount this line" message about
      // the snapshot). Styled inline from the design tokens (a section owns no
      // stylesheet).
      cell: info => {
        const value = info.getValue<number | null | undefined>();
        return (
          <span
            style={{
              display: 'inline-flex',
              'flex-direction': 'column',
              'align-items': 'flex-end',
            }}
          >
            <span>{value ?? ''}</span>
            <Show
              when={
                lineErrors().get(info.row.original.id) ===
                'SnapshotCountCurrentCountMismatchLine'
              }
            >
              <span
                style={{
                  color: 'var(--error-main)',
                  'font-size': 'var(--text-xs)',
                  'white-space': 'normal',
                  'text-align': 'end',
                }}
              >
                {t('error.snapshot-total-mismatch')}
              </span>
            </Show>
          </span>
        );
      },
    },
    {
      c: { key: 'countedNumberOfPacks' },
      sortKey: 'countedNumberOfPacks',
      header: t('label.counted-num-of-packs'),
      ...getNumberCell(),
      meta: { align: 'right', card: { region: 'badge' } },
    },
    // The remaining editable fields (mirroring the line-edit panel) as columns.
    // Start hidden by default. Only the fields the server can sort on carry a
    // `sortKey` (packSize) — the rest render as unsortable headers.
    {
      c: { key: 'packSize' },
      sortKey: 'packSize',
      header: t('label.pack-size'),
      ...getNumberCell(),
    },
    {
      c: { key: 'sellPricePerPack' },
      header: t('label.pack-sell-price'),
      ...getNumberCell(),
    },
    {
      c: { key: 'costPricePerPack' },
      header: t('label.pack-cost-price'),
      ...getNumberCell(),
    },
    {
      c: { key: 'manufactureDate' },
      header: t('label.manufacture-date'),
      ...getDateCell(),
    },
    {
      // Location is nested (location.code) — an accessor column. Server sorts by
      // locationCode.
      c: { accessor: line => line.location?.code ?? '', id: 'location' },
      sortKey: 'locationCode',
      header: t('label.location'),
    },
    {
      // The adjustment reason (reasonOption.reason) — an accessor column. Server
      // sorts by reasonOption.
      c: { accessor: line => line.reasonOption?.reason ?? '', id: 'reason' },
      sortKey: 'reasonOption',
      header: t('label.reason'),
    },
    {
      c: { key: 'note' },
      header: t('label.note'),
    },
  ];

  return (
    // Local Suspense boundary: the FIRST read of data() (info()) suspends until
    // the info fetch lands. Catching it here keeps first-load from tripping the
    // section fallback and remounting the view (kdd/solid-reactivity-pitfalls).
    // Every later stocktake-level save is a mutate(), which never suspends, so
    // this fallback shows only on the initial info fetch. The lines resource is
    // read non-suspending (.latest), so a lines refetch never trips it.
    <Suspense fallback={<Spinner center />}>
      {/* NON-keyed Show: the subtree stays mounted while info() is truthy — a
          keyed Show would tear down + rebuild on every stocktake-level save
          (fresh node object), dropping focus from the field being typed. */}
      <Show when={info()}>
        {node => (
          <Page
            fillBody
            sidePanelOpen={sidePanelOpen()}
            sidePanelTitle={t('heading.details')}
            onSidePanelClose={() => setSidePanelOpen(false)}
            sidePanelContent={
              <StocktakeSidePanel
                node={node()}
                disabled={isDisabled(node())}
                edit={edit}
              />
            }
            header={
              <Header>
                <Breadcrumb crumbs={crumbs(node())} />
                <HeaderButtons>
                  {/* "Add item" — opens the line-edit modal in the item-search
                      state. Only while the stocktake is editable. */}
                  <Show when={!isDisabled(node())}>
                    <Button icon={<PlusCircleIcon />} onClick={openAdd}>
                      {t('button.add-item')}
                    </Button>
                  </Show>
                  <Show when={!sidePanelOpen()}>
                    <Button
                      variant="secondary"
                      icon={<InfoIcon />}
                      onClick={() => setSidePanelOpen(true)}
                    >
                      {t('button.more')}
                    </Button>
                  </Show>
                </HeaderButtons>
                <Toolbar>
                  <StocktakeDetailToolbar
                    node={node()}
                    disabled={isDisabled(node())}
                    edit={edit}
                    filter={filter()}
                    onFilterChange={onFilterChange}
                    locations={locations()}
                  />
                </Toolbar>
              </Header>
            }
            contentFooter={
              // Selection action bar while lines are selected; otherwise the
              // stocktake status footer (on-hold / stepper / finalise). Matches
              // OMS, which swaps the whole footer on selection. Pagination is NOT
              // here anymore — it's overlaid inside the DataTable.
              <Show
                when={selectedIds().length > 0}
                fallback={
                  <StocktakeStatusFooter
                    storeId={params.storeId}
                    node={node()}
                    disabled={isDisabled(node())}
                    canFinalise={canFinalise()}
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
                  <strong>
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
                    rows={rows()}
                    onCommit={onLinesChanged}
                    onError={stampErrors}
                    onShowErrors={showErrors}
                  />
                  <ReduceToZeroAction
                    storeId={params.storeId}
                    selectedIds={selectedIds}
                    disabled={isDisabled(node())}
                    onCommit={onLinesChanged}
                    onError={stampErrors}
                    onShowErrors={showErrors}
                  />
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
            <DataTable
              columns={columns()}
              rows={rows()}
              rowKey={line => line.id}
              // Non-suspending loading read — a between-page/filter/sort refetch
              // keeps rows + shows the refreshing bar; a post-save refetch is
              // silent (tableLoading gates it out). Initial load → Suspense.
              loading={tableLoading()}
              sort={currentSort()}
              onSort={onSort}
              onRowClick={isDisabled(node()) ? undefined : openRow}
              emptyMessage={t('error.no-stocktake-items')}
              empty={
                isDisabled(node()) ? undefined : (
                  <Button
                    icon={<PlusCircleIcon />}
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
              pagination={{
                offset: query().offset,
                pageSize: query().first,
                total: totalCount(),
                onOffsetChange: offset => setQuery({ ...query(), offset }),
                onPageSizeChange: first =>
                  setQuery({ ...query(), first, offset: 0 }),
              }}
            />
            <StocktakeLineEditModal
              open={editState() != null}
              onClose={() => setEditState(undefined)}
              storeId={params.storeId}
              stocktakeId={node().id}
              initialItemId={editState()?.itemId}
              locations={locations()}
              locationsLoading={locationsData.loading}
              nextItem={nextItem}
              onSaved={onLinesChanged}
            />
          </Page>
        )}
      </Show>
    </Suspense>
  );
};

export default StocktakeDetailView;
