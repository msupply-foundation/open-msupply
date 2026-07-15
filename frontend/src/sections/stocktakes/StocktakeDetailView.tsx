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
import { graphqlFetch } from '../../api/graphql';
import { t } from '../../intl';
import { Page } from '../../ui/layout/Page/Page';
import { Header } from '../../ui/layout/Header/Header';
import { Breadcrumb } from '../../ui/layout/Header/Breadcrumb';
import { HeaderButtons } from '../../ui/layout/Header/HeaderButtons';
import { Toolbar } from '../../ui/layout/Header/Toolbar';
import { ContentFooter } from '../../ui/layout/ContentFooter/ContentFooter';
import { ContentFooterActions } from '../../ui/layout/ContentFooter/ContentFooterActions';
import { Button } from '../../ui/elements/buttons/Button';
import { InfoIcon, MinusCircleIcon } from '../../ui/icons';
import {
  DataTable,
  type Column,
  type SortState,
  sharedOrMultiple,
} from '../../ui/elements/table/DataTable';
import { getDateCell, getNumberCell } from '../../ui/elements/table/tableHelpers';
import { createTableConfig } from '../../api/createTableConfig';
import {
  StocktakeDetail,
  type StocktakeDetailResult,
  type StocktakeInfoFragment,
  type UpdateStocktakeVariables,
} from './stocktakeDetail.generated';
import {
  StocktakeLineEditModal,
  type LineEditCommit,
  type StocktakeLineEditItem,
} from './StocktakeLineEditModal';
import { StocktakeStatusFooter } from './StocktakeStatusFooter';
import { StocktakeDetailToolbar } from './StocktakeDetailToolbar';
import { StocktakeSidePanel } from './StocktakeSidePanel';
import { StocktakeErrorDialog, type StocktakeErrorInfo } from './StocktakeErrorDialog';
import {
  DeleteLinesAction,
  ChangeLocationAction,
  ReduceToZeroAction,
} from './actions';
import { saveStocktakeFields, finaliseStocktake } from './stocktakeUpdate';
import { lineMatchesFilter, type StocktakeLineFilter } from './stocktakeLineFilter';
import { createDebouncedEdit } from '../../domain/debouncedEdit';
import type { StocktakeEditFields } from './stocktakeEdit';
import { useUrlQueryState } from '../../list/urlQueryState';

// The stocktake detail view. The page shell (breadcrumb back to the list + an editable
// description + filters), the lines in the DataTable (front-end sorted / grouped / filtered /
// selectable), an Additional-info side panel, and the stocktake-level status footer (on-hold /
// finalise). Clicking a row opens the line-edit modal; saves reflect in place with NO refetch —
// both the line batch mutation and the stocktake-level updateStocktake return the same fragments
// we already render, spliced straight back.
//
// A finalised or on-hold (locked) stocktake is read-only (OMS isStocktakeDisabled): row-click,
// the description/side-panel fields, and Finalise are all disabled; on-hold can still be lifted.

type StocktakeNode = Extract<StocktakeDetailResult['stocktake'], { __typename: 'StocktakeNode' }>;
type Line = StocktakeNode['lines']['nodes'][number];

// A finalised or on-hold (locked) stocktake can't have its content edited (OMS isStocktakeDisabled).
const isDisabled = (node: StocktakeInfoFragment) => node.status !== 'NEW' || node.isLocked;

// The line fields the table can sort by (client-side). `code` reads the nested item.code;
// `location` reads the nested location.code.
type SortKey =
  | 'code'
  | 'itemName'
  | 'batch'
  | 'expiryDate'
  | 'manufactureDate'
  | 'snapshotNumberOfPacks'
  | 'countedNumberOfPacks'
  | 'packSize'
  | 'sellPricePerPack'
  | 'costPricePerPack'
  | 'location'
  | 'reason'
  | 'note';

// A stable, comparable value per sort key. Strings compare case-insensitively; pack counts are
// numbers (null sorts as -1 so uncounted lines group together). Explicit rather than a generic
// accessor map (kdd/explicit-composition).
const sortValue = (line: Line, key: SortKey): string | number => {
  switch (key) {
    case 'code':
      return line.item.code.toLowerCase();
    case 'itemName':
      return line.itemName.toLowerCase();
    case 'batch':
      return (line.batch ?? '').toLowerCase();
    case 'expiryDate':
      return line.expiryDate ?? '';
    case 'manufactureDate':
      return line.manufactureDate ?? '';
    case 'snapshotNumberOfPacks':
      return line.snapshotNumberOfPacks ?? -1;
    case 'countedNumberOfPacks':
      return line.countedNumberOfPacks ?? -1;
    case 'packSize':
      return line.packSize ?? -1;
    case 'sellPricePerPack':
      return line.sellPricePerPack ?? -1;
    case 'costPricePerPack':
      return line.costPricePerPack ?? -1;
    case 'location':
      return (line.location?.code ?? '').toLowerCase();
    case 'reason':
      return (line.reasonOption?.reason ?? '').toLowerCase();
    case 'note':
      return (line.note ?? '').toLowerCase();
  }
};

// The URL-backed view state (kdd/url-structure): sort + the client-side line filter (which
// includes the item `search`) live in the single `?query=` JSON param, so a sorted/filtered/
// searched view is shareable and survives reload + back-nav. Selection and the side-panel open
// state stay local (transient UI, not worth a URL). Errors filter ids are carried too — a stale
// link degrades gracefully (matches whatever ids it holds). Mirrors the stocktakes LIST.
type DetailUrlState = {
  sort: SortState<SortKey>;
  filter: StocktakeLineFilter;
};

const DEFAULT_URL_STATE: DetailUrlState = {
  sort: { key: 'itemName', desc: false },
  filter: {},
};

const StocktakeDetailView: Component = () => {
  const params = useParams<{ storeId: string; stocktakeId: string }>();
  const navigate = useNavigate();
  // Sort + filter (incl. search) are URL-backed (shareable, survive reload/back-nav) in one
  // `?query=` param. sort()/filter()/setSort/setFilter are thin accessors over that single state.
  const { state, setState } = useUrlQueryState<DetailUrlState>(DEFAULT_URL_STATE);
  const sort = () => state().sort;
  const filter = () => state().filter;
  const setSort = (next: SortState<SortKey>) => setState({ ...state(), sort: next });
  const setFilter = (next: StocktakeLineFilter) => setState({ ...state(), filter: next });

  const [selectedIds, setSelectedIds] = createSignal<string[]>([]);
  // The details panel is an overlay — it starts CLOSED (like OMS) and the header info button
  // opens it; its own close button (top inline-end) or the toggle closes it.
  const [sidePanelOpen, setSidePanelOpen] = createSignal(false);
  // The error-summary dialog (a failed finalise / bulk delete). undefined = closed.
  const [errorInfo, setErrorInfo] = createSignal<StocktakeErrorInfo | undefined>();
  // Per-line errors from the last failed finalise/save, keyed by line id → message. Rendered
  // inline under the Snapshot cell of the offending rows (a snapshot/current-count mismatch is a
  // "recount this line" message that belongs on the snapshot). Cleared when a fresh fetch lands.
  const [lineErrors, setLineErrors] = createSignal<Map<string, string>>(new Map());
  // Column config (order/sizing/visibility) + the row-grouping choice persist per user/store.
  // The extra editable columns (pricing / pack size / manufacture / location / reason / note)
  // start HIDDEN by default so the table isn't overwhelming — the user reveals them via the
  // column-visibility settings. columnVisibility is sparse "show" semantics: false = hidden.
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
  // The item being edited (undefined = modal closed).
  const [editItem, setEditItem] = createSignal<StocktakeLineEditItem | undefined>();

  // Fetch the stocktake. A NodeError (e.g. bad id) is promoted to the global unexpected-error
  // modal via mapSuccessToError, so it never reaches the view — we only narrow to the node.
  const [data] = createResource(
    () => ({ storeId: params.storeId, stocktakeId: params.stocktakeId }),
    async (variables) => {
      const result = await graphqlFetch(StocktakeDetail, variables, {
        mapSuccessToError: (d) =>
          d.stocktake.__typename === 'NodeError' ? d.stocktake.error.description : undefined,
      });
      if (result.kind !== 'success') return undefined;
      return result.data.stocktake.__typename === 'StocktakeNode' ? result.data.stocktake : undefined;
    },
  );

  // Stocktake-level info + lines both live in LOCAL signals (seeded from the fetch) so every save
  // reflects in place with no refetch: updateStocktake returns the StocktakeInfo fragment (→ info)
  // and the line batch mutation returns line fragments (→ rows) (kdd/state-management).
  const [info, setInfo] = createSignal<StocktakeInfoFragment | undefined>();
  const [rows, setRows] = createSignal<Line[]>([]);
  createEffect(on(data, (node) => {
    setInfo(node ?? undefined);
    setRows(node?.lines.nodes ?? []);
    setLineErrors(new Map()); // a fresh fetch clears stale per-line errors
  }));

  // Filter → sort. The filter runs first (client-side over the loaded rows), then the sort memo
  // orders what survives. The DataTable is display-only about order (manualSorting).
  const filteredRows = createMemo<Line[]>(() =>
    rows().filter((line) => lineMatchesFilter(line, filter())),
  );
  const sortedRows = createMemo<Line[]>(() => {
    const { key, desc } = sort();
    const dir = desc ? -1 : 1;
    return [...filteredRows()].sort((a, b) => {
      const av = sortValue(a, key);
      const bv = sortValue(b, key);
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
  });

  // A stocktake can be finalised only when it has at least one counted line (OMS no-lines guard).
  const canFinalise = () => rows().some((line) => line.countedNumberOfPacks != null);

  // Header click: TanStack computed the next direction; just record it.
  const onSort = (key: SortKey, desc: boolean) => setSort({ key, desc });

  // Row click → edit that line's ITEM (all its batches).
  const openRow = (line: Line) =>
    setEditItem({ id: line.item.id, code: line.item.code, name: line.itemName });
  const editItemLines = createMemo<Line[]>(() => {
    const item = editItem();
    return item ? rows().filter((line) => line.item.id === item.id) : [];
  });

  // Reflect a line-edit save in place (no refetch): drop deleted ids, replace updated lines by id,
  // append inserted lines — all the SAME StocktakeLine fragment.
  const applyCommit = (commit: LineEditCommit) => {
    setRows((current) => {
      const deleted = new Set(commit.deletedIds);
      const updatedById = new Map(commit.updated.map((line) => [line.id, line]));
      const next = current
        .filter((line) => !deleted.has(line.id))
        .map((line) => updatedById.get(line.id) ?? line);
      return [...next, ...commit.inserted];
    });
  };

  // --- Stocktake-level saves (updateStocktake, spliced back with no refetch) ---

  // Stamp the per-line message on each offending line (rendered inline under its Snapshot cell,
  // and drives the errors filter chip via hasErrors). Both the finalise path and the bulk-action
  // modals feed this, so the inline errors + chip appear however the failure was surfaced.
  const stampLineErrors = (message: string, lineIds: string[]) =>
    setLineErrors(new Map(lineIds.map((id) => [id, message])));

  // Finalise's failure: stamp the lines AND open the summary dialog (the footer Finalise isn't an
  // SelectionActionModal, so it uses the standalone dialog).
  const recordError = (error: StocktakeErrorInfo) => {
    stampLineErrors(error.message, error.lineIds);
    setErrorInfo(error);
  };

  const current = () => info();

  // A stocktake-level field save: patch → updateStocktake, replace `info` in place on success. No
  // user-facing error branch — any rejection here is unexpected (the UI disables the fields once the
  // stocktake is finalised/locked) and saveStocktakeFields has already routed it to the global modal;
  // on undefined we simply stay put. Shared by the debounce buffer (text fields) and on-hold
  // (isLocked); the patch is a subset of UpdateStocktakeInput, so no separate patch type.
  const saveField = async (patch: Partial<Omit<UpdateStocktakeVariables['input'], 'id'>>) => {
    const node = current();
    if (!node) return;
    const saved = await saveStocktakeFields(params.storeId, { id: node.id, ...patch });
    if (saved) setInfo(saved);
  };

  // ONE debounced-edit buffer for every as-you-type text field on the stocktake (the toolbar's
  // description + the side panel's counted-by / verified-by / comment), owned here and passed whole
  // to both children. One buffer = coalescing spans the whole entity: editing the description then a
  // side-panel field in a single burst sends ONE updateStocktake with all changed keys, not two
  // (createDebouncedEdit accumulates the dirty keys). Seeded from info() and re-seeded when the
  // stocktake identity changes — including the first time the fetch lands (id goes '' → the real id,
  // populating the buffer); never re-hydrated from a save result, so a returned node can't clobber
  // in-progress typing. The debounced save writes the changed fields straight through saveField.
  const edit = createDebouncedEdit<StocktakeEditFields>({
    id: () => current()?.id ?? '',
    initial: () => ({
      description: current()?.description ?? '',
      countedBy: current()?.countedBy ?? '',
      verifiedBy: current()?.verifiedBy ?? '',
      comment: current()?.comment ?? '',
    }),
    save: (patch) => void saveField(patch),
  });
  const setHold = (hold: boolean) => void saveField({ isLocked: hold });

  // Finalise — the ACTION with user-facing errors, and the ONLY status write (a stocktake goes
  // NEW → FINALISED, no intermediate / no un-finalise, and UpdateStocktakeInput.status only accepts
  // FINALISED). A saved node replaces `info` in place; a rejection (snapshot mismatch / lock) opens
  // the error-summary dialog; a transport failure is silent (global modal).
  const finalise = async () => {
    const node = current();
    if (!node) return;
    const result = await finaliseStocktake(params.storeId, node.id);
    if (result.kind === 'saved') {
      setInfo(result.node);
    } else if (result.kind === 'error') {
      recordError({ message: result.message, lineIds: result.lineIds });
    }
  };

  // --- Selection actions ---
  // Each action (Delete / Change location / Reduce to 0) is its own self-contained component in
  // actions/ (button + modal + run); the view keeps ownership of rows/selection/errors and applies
  // each result via these callbacks (no refetch). Delete drops the deleted lines; the updates
  // splice the returned lines back; a partial failure stamps the per-line errors.
  //
  // The apply callbacks DON'T clear the selection — the action components host their modal inside
  // the selection footer, so clearing here would unmount the modal mid-success-phase. Selection is
  // cleared when the modal closes, by which point the success/error phase has been seen.
  const applyDeleted = (deletedIds: string[]) => {
    const gone = new Set(deletedIds);
    setRows((rows) => rows.filter((line) => !gone.has(line.id)));
  };
  const applyUpdated = (lines: Line[]) => {
    const byId = new Map(lines.map((line) => [line.id, line]));
    setRows((rows) => rows.map((line) => byId.get(line.id) ?? line));
  };

  // "Show error lines" (the action modals' error phase + the finalise error dialog): wipe every
  // other filter and keep ONLY the error lines (OMS "add filter for errors"). Clears the selection
  // so the footer returns to the status view.
  const showErrorLines = (lineIds: string[]) => {
    setFilter({ errorIds: lineIds });
    setSelectedIds([]);
    setErrorInfo(undefined);
  };

  // Crumbs are an accessor so t() re-translates on locale change.
  const crumbs = (node: StocktakeInfoFragment) => [
    { label: t('nav.inventory') },
    {
      label: t('nav.inventory.stocktakes'),
      onClick: () => navigate(`/${params.storeId}/inventory/stocktakes`),
    },
    { label: t('stocktake.detail.title', { number: node.stocktakeNumber }) },
  ];

  const columns = (): Column<Line, SortKey>[] => [
    {
      c: { accessor: (line) => line.item.code, id: 'code' },
      sortKey: 'code',
      header: t('stocktake.column.item-code'),
    },
    {
      c: { key: 'itemName' },
      sortKey: 'itemName',
      header: t('stocktake.column.item-name'),
      // Item names are long — allow up to two wrapped lines before clamping.
      meta: { card: { region: 'primary' }, wrapLines: 2 },
      aggregationFn: sharedOrMultiple,
    },
    {
      c: { key: 'batch' },
      sortKey: 'batch',
      header: t('stocktake.column.batch'),
      aggregationFn: sharedOrMultiple,
    },
    {
      c: { key: 'expiryDate' },
      sortKey: 'expiryDate',
      header: t('stocktake.column.expiry'),
      ...getDateCell(),
    },
    {
      c: { key: 'snapshotNumberOfPacks' },
      sortKey: 'snapshotNumberOfPacks',
      header: t('stocktake.column.snapshot'),
      ...getNumberCell(),
      // Snapshot cell also carries the line's error inline beneath the count (a
      // snapshot/current-count mismatch is a "recount this line" message about the snapshot). The
      // error wraps on its own line in the error tone; colours/sizes are tokens (a section owns no
      // stylesheet, so the dynamic sub-text is styled inline from the design tokens).
      cell: (info) => {
        const value = info.getValue<number | null | undefined>();
        const error = lineErrors().get(info.row.original.id);
        return (
          <span style={{ display: 'inline-flex', 'flex-direction': 'column', 'align-items': 'flex-end' }}>
            <span>{value ?? ''}</span>
            <Show when={error}>
              <span
                style={{
                  color: 'var(--error-main)',
                  'font-size': 'var(--text-xs)',
                  'white-space': 'normal',
                  'text-align': 'end',
                }}
              >
                {error}
              </span>
            </Show>
          </span>
        );
      },
    },
    {
      c: { key: 'countedNumberOfPacks' },
      sortKey: 'countedNumberOfPacks',
      header: t('stocktake.column.counted'),
      ...getNumberCell(),
      meta: { align: 'right', card: { region: 'badge' } },
    },
    // The remaining editable fields (mirroring the line-edit panel) as columns, so the detail
    // table shows everything the editor can change. Start hidden by default so the table isn't
    // overwhelming — the user reveals them via the column-visibility settings.
    {
      c: { key: 'packSize' },
      sortKey: 'packSize',
      header: t('stocktake.column.pack-size'),
      ...getNumberCell(),
    },
    {
      c: { key: 'sellPricePerPack' },
      sortKey: 'sellPricePerPack',
      header: t('stocktake.column.sell-price'),
      ...getNumberCell(),
    },
    {
      c: { key: 'costPricePerPack' },
      sortKey: 'costPricePerPack',
      header: t('stocktake.column.cost-price'),
      ...getNumberCell(),
    },
    {
      c: { key: 'manufactureDate' },
      sortKey: 'manufactureDate',
      header: t('stocktake.column.manufacture-date'),
      ...getDateCell(),
    },
    {
      // Location is nested (location.code) — an accessor column.
      c: { accessor: (line) => line.location?.code ?? '', id: 'location' },
      sortKey: 'location',
      header: t('stocktake.column.location'),
    },
    {
      // The adjustment reason (reasonOption.reason) — an accessor column.
      c: { accessor: (line) => line.reasonOption?.reason ?? '', id: 'reason' },
      sortKey: 'reason',
      header: t('stocktake.column.reason'),
    },
    {
      c: { key: 'note' },
      sortKey: 'note',
      header: t('stocktake.column.note'),
    },
  ];

  return (
    <Suspense>
      {/* NON-keyed Show: the subtree stays mounted while info() is truthy. It must NOT be `keyed`
          — a keyed Show re-runs (tears down + rebuilds) its child whenever the `when` value's
          IDENTITY changes, and every stocktake-level save sets a fresh node object (setInfo), so
          keyed would recreate the whole page — dropping focus from the description/side-panel
          input you're typing in. Non-keyed passes an accessor (node()) and only the fine-grained
          reads re-run. */}
      <Show when={info()}>
        {(node) => (
          <Page
            fillBody
            sidePanelOpen={sidePanelOpen()}
            sidePanelTitle={t('stocktake.detail.side-panel')}
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
                  {/* A labelled "More" button (info icon + text), like OMS's details button. It
                      hides while the panel is open — the panel's own close button takes over. */}
                  <Show when={!sidePanelOpen()}>
                    <Button
                      variant="secondary"
                      icon={<InfoIcon />}
                      onClick={() => setSidePanelOpen(true)}
                    >
                      {t('common.more')}
                    </Button>
                  </Show>
                </HeaderButtons>
                <Toolbar>
                  <StocktakeDetailToolbar
                    node={node()}
                    disabled={isDisabled(node())}
                    edit={edit}
                    filter={filter()}
                    onFilterChange={setFilter}
                    hasErrors={lineErrors().size > 0}
                  />
                </Toolbar>
              </Header>
            }
            contentFooter={
              // Selection action bar while lines are selected (delete); otherwise the stocktake
              // status footer (on-hold / stepper / finalise). Matches OMS, which swaps the whole
              // footer on selection.
              <Show
                when={selectedIds().length > 0}
                fallback={
                  <StocktakeStatusFooter
                    node={node()}
                    disabled={isDisabled(node())}
                    canFinalise={canFinalise()}
                    onSetHold={setHold}
                    onFinalise={finalise}
                  />
                }
              >
                <ContentFooter>
                  {/* Count + actions on the inline-start (OMS layout): Delete, Change location,
                      Reduce to 0. All disabled while the stocktake is finalised / on hold. */}
                  <strong>{t('stocktake.lines.selected', { count: selectedIds().length })}</strong>
                  {/* Each action owns its own button + confirm/working/success/error modal + run;
                      the view supplies storeId/selection and applies results via callbacks. */}
                  <DeleteLinesAction
                    storeId={params.storeId}
                    selectedIds={selectedIds}
                    disabled={isDisabled(node())}
                    onDeleted={applyDeleted}
                    onError={stampLineErrors}
                    onShowErrors={showErrorLines}
                  />
                  <ChangeLocationAction
                    storeId={params.storeId}
                    selectedIds={selectedIds}
                    disabled={isDisabled(node())}
                    onUpdated={applyUpdated}
                    onError={stampLineErrors}
                    onShowErrors={showErrorLines}
                  />
                  <ReduceToZeroAction
                    storeId={params.storeId}
                    selectedIds={selectedIds}
                    disabled={isDisabled(node())}
                    onUpdated={applyUpdated}
                    onError={stampLineErrors}
                    onShowErrors={showErrorLines}
                  />
                  {/* Clear selection pinned to the inline-end. */}
                  <ContentFooterActions>
                    <Button
                      variant="secondary"
                      icon={<MinusCircleIcon />}
                      onClick={() => setSelectedIds([])}
                    >
                      {t('stocktake.lines.clear-selection')}
                    </Button>
                  </ContentFooterActions>
                </ContentFooter>
              </Show>
            }
          >
            <DataTable
              columns={columns()}
              rows={sortedRows()}
              rowKey={(line) => line.id}
              sort={sort()}
              onSort={onSort}
              onRowClick={isDisabled(node()) ? undefined : openRow}
              emptyMessage={t('stocktake.detail.empty')}
              rowGroup={{ columnId: 'code', labelKey: 'stocktake.column.item-name' }}
              enableSelection
              selectedIds={selectedIds()}
              onSelectionChange={setSelectedIds}
              config={tableConfig.config()}
              setConfig={tableConfig.setConfig}
            />
            <StocktakeLineEditModal
              open={editItem() != null}
              onClose={() => setEditItem(undefined)}
              storeId={params.storeId}
              stocktakeId={node().id}
              item={editItem()}
              lines={editItemLines()}
              onCommitted={applyCommit}
            />
            <StocktakeErrorDialog
              error={errorInfo()}
              onClose={() => setErrorInfo(undefined)}
              onShowErrors={showErrorLines}
            />
          </Page>
        )}
      </Show>
    </Suspense>
  );
};

export default StocktakeDetailView;
