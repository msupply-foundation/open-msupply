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
import { CheckIcon, InfoIcon, MapPinIcon, MinusCircleIcon, TrashIcon } from '../../ui/icons';
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
  type BatchStocktakeLinesVariables,
} from './stocktakeDetail.generated';

// One per-line update (the shape updateStocktakeLines takes) — change-location / reduce-to-0.
type LineUpdate = NonNullable<BatchStocktakeLinesVariables['update']>[number];
import {
  StocktakeLineEditModal,
  type LineEditCommit,
  type StocktakeLineEditItem,
} from './StocktakeLineEditModal';
import { StocktakeStatusFooter } from './StocktakeStatusFooter';
import { StocktakeDetailToolbar } from './StocktakeDetailToolbar';
import { StocktakeSidePanel } from './StocktakeSidePanel';
import { StocktakeErrorDialog, type StocktakeErrorInfo } from './StocktakeErrorDialog';
import { ActionModal, type ActionResult } from './ActionModal';
import { runStocktakeUpdate, deleteStocktakeLines, updateStocktakeLines } from './stocktakeUpdate';
import { lineMatchesFilter, type StocktakeLineFilter } from './stocktakeLineFilter';
import { FieldRow } from '../../ui/elements/inputs/FieldRow';
import { LocationSelect } from '../../domain/location';
import { ReasonSelect } from '../../domain/reasonOptions';
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
  // The three selection-action modals (each an ActionModal: confirm → working → success | error).
  // false = closed. Change-location / reduce-to-0 also hold their picker's chosen value.
  const [deleteOpen, setDeleteOpen] = createSignal(false);
  const [locationOpen, setLocationOpen] = createSignal(false);
  const [reduceOpen, setReduceOpen] = createSignal(false);
  const [pickedLocationId, setPickedLocationId] = createSignal<string | null>(null);
  const [pickedReasonId, setPickedReasonId] = createSignal<string | null>(null);
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

  // --- Stocktake-level saves (all through updateStocktake, spliced back with no refetch) ---

  // Stamp the per-line message on each offending line (rendered inline under its Snapshot cell,
  // and drives the errors filter chip via hasErrors). Both the finalise path and the bulk-action
  // modals feed this, so the inline errors + chip appear however the failure was surfaced.
  const stampLineErrors = (message: string, lineIds: string[]) =>
    setLineErrors(new Map(lineIds.map((id) => [id, message])));

  // Finalise's failure: stamp the lines AND open the summary dialog (the footer Finalise isn't an
  // ActionModal, so it uses the standalone dialog).
  const recordError = (error: StocktakeErrorInfo) => {
    stampLineErrors(error.message, error.lineIds);
    setErrorInfo(error);
  };

  // A field / status / hold save. On a saved node we replace `info` in place. A finalise rejection
  // (or a lock error) opens the error-summary dialog. A transport failure is silent (global modal).
  const applyUpdate = async (input: Parameters<typeof runStocktakeUpdate>[0]['input']) => {
    const result = await runStocktakeUpdate({ storeId: params.storeId, input });
    if (result.kind === 'saved') {
      setInfo(result.node);
    } else if (result.kind === 'error') {
      recordError({ message: result.message, lineIds: result.lineIds });
    }
  };

  const current = () => info();
  // The editable non-status fields (status is only ever set to FINALISED, via finalise()).
  type StocktakeFieldPatch = {
    description?: string;
    comment?: string;
    countedBy?: string;
    verifiedBy?: string;
    isLocked?: boolean;
  };
  const saveFields = (patch: StocktakeFieldPatch) => {
    const node = current();
    if (node) void applyUpdate({ id: node.id, ...patch });
  };
  const setHold = (hold: boolean) => saveFields({ isLocked: hold });
  // Advance the stocktake status. The footer only ever emits a forward (non-disabled) status, and
  // the update input only accepts FINALISED, so anything else is ignored.
  const changeStatus = (status: 'NEW' | 'FINALISED') => {
    const node = current();
    if (node && status === 'FINALISED') void applyUpdate({ id: node.id, status });
  };

  // --- Selection actions (each an ActionModal `run` → ActionResult) ---
  // These both apply the successful part in place (no refetch) AND report ok/error so the modal
  // can show its working → success | error phases. A transport/unexpected failure is handled
  // globally (graphqlFetch), so run() reports `ok` there and the modal just closes.

  // Delete the selected lines.
  const runDeleteLines = async (): Promise<ActionResult> => {
    const result = await deleteStocktakeLines(params.storeId, selectedIds());
    if (result.kind === 'failed') return { kind: 'ok' };
    const deleted = new Set(result.deletedIds);
    setRows((rows) => rows.filter((line) => !deleted.has(line.id)));
    setSelectedIds((selected) => selected.filter((id) => !deleted.has(id)));
    if (result.kind === 'partial') {
      stampLineErrors(result.error.message, result.error.lineIds);
      return { kind: 'error', message: result.error.message, lineIds: result.error.lineIds };
    }
    return { kind: 'ok' };
  };

  // Apply a bulk line update to the selection (change-location / reduce-to-0). Splices the updated
  // fragments back in place; `patch(id)` builds the per-line UpdateStocktakeLineInput.
  const runLineUpdate = async (patch: (id: string) => LineUpdate): Promise<ActionResult> => {
    const result = await updateStocktakeLines(params.storeId, selectedIds().map(patch));
    if (result.kind === 'failed') return { kind: 'ok' };
    const updatedById = new Map(result.updated.map((line) => [line.id, line]));
    setRows((rows) => rows.map((line) => updatedById.get(line.id) ?? line));
    setSelectedIds([]);
    if (result.kind === 'partial') {
      stampLineErrors(result.error.message, result.error.lineIds);
      return { kind: 'error', message: result.error.message, lineIds: result.error.lineIds };
    }
    return { kind: 'ok' };
  };

  // Change location: set location.id on every selected line.
  const runChangeLocation = (locationId: string | null) =>
    runLineUpdate((id) => ({ id, location: { value: locationId } }));

  // Reduce to 0: set countedNumberOfPacks = 0 on every selected line, with the chosen adjustment
  // reason. The server enforces whether a reason is required; an unmet requirement comes back as
  // the error phase (→ Show error lines).
  const runReduceToZero = (reasonOptionId: string | null) =>
    runLineUpdate((id) => ({ id, countedNumberOfPacks: 0, reasonOptionId }));

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
                onSave={(patch) => saveFields(patch)}
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
                    onSaveDescription={(description) => saveFields({ description })}
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
                    onChangeStatus={changeStatus}
                  />
                }
              >
                <ContentFooter>
                  {/* Count + actions on the inline-start (OMS layout): Delete, Change location,
                      Reduce to 0. All disabled while the stocktake is finalised / on hold. */}
                  <strong>{t('stocktake.lines.selected', { count: selectedIds().length })}</strong>
                  <Button
                    variant="secondary"
                    icon={<TrashIcon />}
                    disabled={isDisabled(node())}
                    onClick={() => setDeleteOpen(true)}
                  >
                    {t('common.delete')}
                  </Button>
                  <Button
                    variant="secondary"
                    icon={<MapPinIcon />}
                    disabled={isDisabled(node())}
                    onClick={() => {
                      setPickedLocationId(null);
                      setLocationOpen(true);
                    }}
                  >
                    {t('stocktake.lines.change-location')}
                  </Button>
                  <Button
                    variant="secondary"
                    icon={<MinusCircleIcon />}
                    disabled={isDisabled(node())}
                    onClick={() => {
                      setPickedReasonId(null);
                      setReduceOpen(true);
                    }}
                  >
                    {t('stocktake.lines.reduce-to-zero')}
                  </Button>
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
            {/* The three bulk selection actions — each a confirm → working → success | error
                ActionModal (kdd/action-modal); an error phase offers "Show error lines". */}
            <ActionModal
              open={deleteOpen()}
              onClose={() => setDeleteOpen(false)}
              icon={<TrashIcon />}
              title={t('stocktake.lines.delete-title')}
              confirmLabel={t('common.delete')}
              confirmIcon={<TrashIcon />}
              run={runDeleteLines}
              successMessage={t('stocktake.lines.delete-success')}
              onShowErrors={showErrorLines}
            >
              {t('stocktake.lines.delete-confirm', { count: selectedIds().length })}
            </ActionModal>
            <ActionModal
              open={locationOpen()}
              onClose={() => setLocationOpen(false)}
              icon={<MapPinIcon />}
              title={t('stocktake.lines.change-location')}
              confirmLabel={t('common.apply')}
              confirmIcon={<CheckIcon />}
              run={() => runChangeLocation(pickedLocationId())}
              successMessage={t('stocktake.lines.change-location-success')}
              onShowErrors={showErrorLines}
            >
              <p>{t('stocktake.lines.change-location-message')}</p>
              <FieldRow label={t('stocktake.line-edit.location')}>
                <LocationSelect
                  label={t('stocktake.line-edit.location')}
                  hideLabel
                  value={pickedLocationId() ?? undefined}
                  placeholder={t('stocktake.line-edit.location-none')}
                  onChange={(l) => setPickedLocationId(l?.id ?? null)}
                />
              </FieldRow>
            </ActionModal>
            <ActionModal
              open={reduceOpen()}
              onClose={() => setReduceOpen(false)}
              icon={<MinusCircleIcon />}
              title={t('stocktake.lines.reduce-to-zero-title')}
              confirmLabel={t('common.apply')}
              confirmIcon={<CheckIcon />}
              run={() => runReduceToZero(pickedReasonId())}
              successMessage={t('stocktake.lines.reduce-to-zero-success')}
              onShowErrors={showErrorLines}
            >
              <p>{t('stocktake.lines.reduce-to-zero-message')}</p>
              <FieldRow label={t('stocktake.line-edit.reason')}>
                <ReasonSelect
                  kind="reduction"
                  label={t('stocktake.line-edit.reason')}
                  hideLabel
                  value={pickedReasonId() ?? undefined}
                  placeholder={t('stocktake.line-edit.reason-select')}
                  onChange={(r) => setPickedReasonId(r?.id ?? null)}
                />
              </FieldRow>
            </ActionModal>
          </Page>
        )}
      </Show>
    </Suspense>
  );
};

export default StocktakeDetailView;
