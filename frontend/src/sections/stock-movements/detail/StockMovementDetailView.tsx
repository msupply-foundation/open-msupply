import {
  createMemo,
  createResource,
  createSignal,
  Show,
  Suspense,
  type Component,
} from 'solid-js';
import { useNavigate, useParams } from '@solidjs/router';
import { graphqlFetch } from '@/api/graphql';
import { t } from '@/intl';
import { Page } from '@/ui/layout/Page/Page';
import { Header } from '@/ui/layout/Header/Header';
import { Breadcrumb } from '@/ui/layout/Header/Breadcrumb';
import { HeaderButtons } from '@/ui/layout/Header/HeaderButtons';
import { HeaderToolbar } from '@/ui/layout/Header/HeaderToolbar';
import { ContentFooter } from '@/ui/layout/ContentFooter/ContentFooter';
import { ContentFooterActions } from '@/ui/layout/ContentFooter/ContentFooterActions';
import { Button } from '@/ui/elements/buttons/Button';
import { OkButton } from '@/ui/elements/buttons/StandardButtons';
import { createAddAction } from '@/ui/utils/keyActions';
import { ALT_M, ALT_N } from '@/ui/utils/shortcuts';
import {
  DataTable,
  type Column,
  type SortState,
} from '@/ui/elements/table/DataTable';
import { getDateCell, getNumberCell } from '@/ui/elements/table/tableHelpers';
import { createTableConfig } from '@/api/createTableConfig';
import { TextField } from '@/ui/elements/inputs/TextField';
import { Dialog } from '@/ui/elements/feedback/Dialog';
import { Spinner } from '@/ui/elements/feedback/Spinner';
import { createSidePanelOpen } from '@/ui/layout/SidePanel/createSidePanelOpen';
import { createDebouncedEdit } from '@/domain/debouncedEdit';
import { fetchLocationsWithVolume } from '@/domain/location';
import { CloseIcon, PlusCircleIcon, SidebarIcon } from '@/ui/icons';
import {
  StockMovementDetail,
  type StockMovementDetailResult,
  type StockMovementDetailVariables,
  type StockMovementInfoFragment,
  type StockMovementLineFragment,
} from './stockMovementDetail.generated';
import { isFinalised, statusLabel } from './stockMovementStatus';
import { saveComment } from './stockMovementUpdate';
import { StockMovementSidePanel } from './StockMovementSidePanel';
import { StockMovementStatusFooter } from './StockMovementStatusFooter';
import { DeleteLinesAction, ExportPrintAction } from './actions';
import { StockMovementLineEditModal } from './edit-modal/StockMovementLineEditModal';
import type { MovementEditFields } from './stockMovementEdit';

// The stock-movement detail view (spec/stock-movements/ui-surface.md S2):
// header identity fields, the flat line table (loaded WITH the document — a
// bounded working set, no pagination; group-by deferred per D63), the status
// footer, the side panel, and the line editor. Read-only once FINALISED
// (rules § editability — NEW and CONFIRMED are equally editable).

type MovementNode = Extract<
  StockMovementDetailResult['stockRelocation'],
  { __typename: 'StockRelocationNode' }
>;

// Client-side line sort — the line set is bounded and arrives whole, so the
// table sorts locally (contrast the server-paginated detail tables).
type LineSortKey =
  'itemCode' | 'itemName' | 'batch' | 'sourceLocation' | 'destinationLocation';

const lineSortValue = (
  row: StockMovementLineFragment,
  key: LineSortKey
): string => {
  switch (key) {
    case 'itemCode':
      return row.stockLine?.item.code ?? '';
    case 'itemName':
      return row.stockLine?.itemName ?? '';
    case 'batch':
      return row.stockLine?.batch ?? '';
    case 'sourceLocation':
      return row.sourceLocation?.code ?? '';
    case 'destinationLocation':
      return row.destinationLocation?.code ?? '';
  }
};

const StockMovementDetailView: Component = () => {
  const params = useParams<{ storeId: string; movementId: string }>();
  const navigate = useNavigate();

  const [data, { mutate, refetch }] = createResource(
    () =>
      JSON.stringify({
        storeId: params.storeId,
        id: params.movementId,
      } satisfies StockMovementDetailVariables),
    async serialised => {
      const result = await graphqlFetch(
        StockMovementDetail,
        JSON.parse(serialised) as StockMovementDetailVariables
      );
      if (result.kind !== 'success') return undefined;
      return result.data.stockRelocation;
    }
  );

  // The document (or undefined while loading / on miss). First read suspends
  // into the LOCAL Suspense below (initial load only — no user state to lose);
  // every later change is a mutate() splice or a `.latest`-preserving refetch.
  const node = (): MovementNode | undefined => {
    const d = data.latest;
    return d?.__typename === 'StockRelocationNode' ? d : undefined;
  };
  // An unknown id — or another store's document — is the typed miss (contract
  // § list rules): the S2 blocking alert, OK back to the list.
  const notFound = () => data.latest?.__typename === 'RecordNotFound';

  const disabled = () => {
    const n = node();
    return n ? isFinalised(n.status) : true;
  };
  const rows = () => node()?.lines.nodes ?? [];

  // Header-level saves splice the fresh info over the node in place — no
  // refetch (kdd/state-management); the lines are untouched by them.
  const applyInfo = (info: StockMovementInfoFragment) => {
    mutate(prev =>
      prev?.__typename === 'StockRelocationNode' ? { ...prev, ...info } : prev
    );
  };

  // Line-level changes refetch the whole document (the line set rides it —
  // lineCount, and after a failed finalise nothing changed server-side).
  const onLinesChanged = () => void refetch();

  // The one as-you-type field (the side panel's comment): one debounced
  // buffer, saved as a header patch, spliced back (kdd/state-management).
  const edit = createDebouncedEdit<MovementEditFields>({
    // The RESOURCE-derived id, not the route param: '' while pending, the real
    // id once loaded — that flip is what triggers the buffer's seed, so the
    // comment seeds from the LOADED document (the stocktake precedent).
    id: () => node()?.id ?? '',
    initial: () => ({ comment: node()?.comment ?? '' }),
    save: patch => {
      void saveComment(params.storeId, {
        id: params.movementId,
        ...patch,
      }).then(saved => saved && applyInfo(saved));
    },
  });

  // The destination picker's volume-bearing locations (volumeUsed is
  // server-computed and staleable, so the view owns the fetch and re-reads on
  // every modal open — locationResource's contract). State-gated read: the
  // refetch fires on an interaction (opening the editor) while the screen is
  // live (kdd/solid-reactivity-pitfalls).
  const [locationsData, { refetch: refetchLocations }] = createResource(
    () => params.storeId,
    storeId => fetchLocationsWithVolume(storeId)
  );
  const locations = () =>
    locationsData.state === 'ready' || locationsData.state === 'refreshing'
      ? (locationsData.latest ?? [])
      : [];

  // --- selection + line editor ----------------------------------------------
  const [selectedIds, setSelectedIds] = createSignal<string[]>([]);
  const [editorOpen, setEditorOpen] = createSignal(false);
  const [editingLine, setEditingLine] = createSignal<
    StockMovementLineFragment | undefined
  >();

  const openAdd = () => {
    if (disabled()) return;
    setEditingLine(undefined);
    void refetchLocations();
    setEditorOpen(true);
  };
  const openRow = (row: StockMovementLineFragment) => {
    if (disabled()) return;
    setEditingLine(row);
    void refetchLocations();
    setEditorOpen(true);
  };
  createAddAction({
    name: 'button.add-line',
    run: openAdd,
  });

  const onLinesDeleted = () => {
    setSelectedIds([]);
    onLinesChanged();
  };

  const [sidePanelOpen, setSidePanelOpen] = createSidePanelOpen();

  // --- line table --------------------------------------------------------------
  const [sort, setSort] = createSignal<SortState<LineSortKey>>({
    key: 'itemName',
    desc: false,
  });
  const sortedRows = createMemo(() => {
    const { key, desc } = sort();
    const collator = new Intl.Collator(undefined, { sensitivity: 'base' });
    const sorted = [...rows()].sort((a, b) =>
      collator.compare(lineSortValue(a, key), lineSortValue(b, key))
    );
    return desc ? sorted.reverse() : sorted;
  });

  const tableConfig = createTableConfig({
    tableId: 'stock-movement-lines',
    defaultConfig: {
      compact: {
        // Narrow viewports hide the reference figures (ui-surface S2 —
        // expiry, packs in stock, pack size hidden by default on narrow).
        columnVisibility: {
          expiryDate: false,
          packsInStock: false,
          packSize: false,
        },
      },
    },
  });

  const columns = (): Column<StockMovementLineFragment, LineSortKey>[] => [
    {
      c: {
        accessor: row => row.stockLine?.item.code ?? '',
        id: 'itemCode',
      },
      sortKey: 'itemCode',
      header: () => t('label.code'),
      meta: { headerPosition: 'primary' },
    },
    {
      c: { accessor: row => row.stockLine?.itemName ?? '', id: 'itemName' },
      sortKey: 'itemName',
      header: () => t('label.name'),
      meta: { wrapLines: 2 },
    },
    {
      c: { accessor: row => row.stockLine?.batch ?? '', id: 'batch' },
      sortKey: 'batch',
      header: () => t('label.batch'),
    },
    {
      c: { accessor: row => row.stockLine?.expiryDate, id: 'expiryDate' },
      header: () => t('label.expiry-date'),
      ...getDateCell(),
    },
    {
      // The batch's CURRENT total packs — live, so it shifts after finalise
      // (ui-surface S2 § line table; contract § lines).
      c: {
        accessor: row => row.stockLine?.totalNumberOfPacks,
        id: 'packsInStock',
      },
      header: () => t('label.packs-in-stock'),
      ...getNumberCell(),
    },
    {
      c: { accessor: row => row.stockLine?.packSize, id: 'packSize' },
      header: () => t('label.pack-size'),
      ...getNumberCell(),
    },
    {
      c: {
        accessor: row => row.sourceLocation?.code ?? '',
        id: 'sourceLocation',
      },
      sortKey: 'sourceLocation',
      header: () => t('label.source-location'),
    },
    {
      c: {
        accessor: row => row.destinationLocation?.code ?? '',
        id: 'destinationLocation',
      },
      sortKey: 'destinationLocation',
      header: () => t('label.destination-location'),
    },
    {
      c: { key: 'numberOfPacks' },
      header: () => t('label.packs-to-move'),
      ...getNumberCell(),
    },
  ];

  const crumbs = (n: MovementNode) => [
    {
      label: t('stock-movement'),
      onClick: () => navigate(`/${params.storeId}/inventory/stock-movement`),
    },
    { label: String(n.stockMovementNumber) },
  ];

  return (
    <Suspense fallback={<Spinner center />}>
      {/* The typed not-found miss — a blocking alert whose OK returns to the
          list (ui-surface S2). */}
      <Show when={notFound()}>
        <Dialog
          open
          dismissable={false}
          onClose={() => undefined}
          title={t('error.stock-movement-not-found')}
          description={t('messages.click-to-return-to-stock-movements')}
          actions={
            <OkButton
              data-testid="dialog-button-ok"
              onClick={() =>
                navigate(`/${params.storeId}/inventory/stock-movement`, {
                  replace: true,
                })
              }
            />
          }
        />
      </Show>
      {/* NON-keyed Show: the subtree stays mounted while node() is truthy — a
          keyed Show would remount on every header splice (fresh object) and
          drop comment-field focus (kdd/solid-reactivity-pitfalls). */}
      <Show when={node()}>
        {n => (
          <Page
            fillBody
            sidePanelOpen={sidePanelOpen()}
            sidePanelTitle={t('heading.details')}
            onSidePanelClose={() => setSidePanelOpen(false)}
            sidePanelContent={
              <StockMovementSidePanel
                node={n()}
                disabled={disabled()}
                edit={edit}
                fullDocument={node}
              />
            }
            header={
              <Header>
                <Breadcrumb crumbs={crumbs(n())} />
                <HeaderButtons>
                  {/* Add line — hidden once finalised (ui-surface S2). */}
                  <Show when={!disabled()}>
                    <Button
                      icon={<PlusCircleIcon />}
                      shortcut={ALT_N}
                      data-testid="add-line-button"
                      onClick={openAdd}
                    >
                      {t('button.add-line')}
                    </Button>
                  </Show>
                  <ExportPrintAction
                    movementId={n().id}
                    leadingAction={disabled()}
                  />
                  <Show when={!sidePanelOpen()}>
                    <Button
                      variant="secondary"
                      icon={<SidebarIcon />}
                      data-testid="open-detail-panel-button"
                      shortcut={ALT_M}
                      onClick={() => setSidePanelOpen(true)}
                    >
                      {t('button.more')}
                    </Button>
                  </Show>
                </HeaderButtons>
                {/* The two read-only identity fields (ui-surface S2 § header
                    fields). */}
                <HeaderToolbar>
                  <TextField
                    label={t('label.number')}
                    size="small"
                    width="compact"
                    disabled
                    data-testid="movement-number-field"
                    value={String(n().stockMovementNumber)}
                  />
                  <TextField
                    label={t('label.status')}
                    size="small"
                    width="compact"
                    disabled
                    data-testid="movement-status-field"
                    value={statusLabel(n().status)}
                  />
                </HeaderToolbar>
              </Header>
            }
            contentFooter={
              <Show
                when={selectedIds().length > 0}
                fallback={
                  <StockMovementStatusFooter
                    storeId={params.storeId}
                    node={n()}
                    onAdvanced={applyInfo}
                  />
                }
              >
                <ContentFooter testId="actions-footer">
                  <strong data-testid="selected-rows-count">
                    {selectedIds().length} {t('label.selected')}
                  </strong>
                  <DeleteLinesAction
                    storeId={params.storeId}
                    movementId={n().id}
                    selectedLineIds={selectedIds}
                    onDeleted={onLinesDeleted}
                  />
                  <ContentFooterActions>
                    <Button
                      variant="secondary"
                      icon={<CloseIcon />}
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
              rows={sortedRows()}
              rowKey={r => r.id}
              loading={data.loading}
              sort={sort()}
              onSort={(key, desc) => setSort({ key, desc })}
              onRowClick={disabled() ? undefined : openRow}
              emptyMessage={t('messages.no-stock-movement-lines')}
              empty={
                disabled() ? undefined : (
                  <Button
                    variant="ghost"
                    shortcut={ALT_N}
                    data-testid="nothing-here-create-button"
                    onClick={openAdd}
                  >
                    {t('button.add-line')}
                  </Button>
                )
              }
              enableSelection={!disabled()}
              selectedIds={selectedIds()}
              onSelectionChange={setSelectedIds}
              config={tableConfig.config()}
              setConfig={tableConfig.setConfig}
              // Central-server admins can promote this table's layout to the
              // shared install-wide default, the same as the list (issue #1118
              // — detail tables offered no way to save table defaults). Gate +
              // action both off the config controller; undefined for everyone
              // else, so the action isn't offered.
              onSaveGlobalDefault={
                tableConfig.canSaveGlobalDefault()
                  ? tableConfig.saveGlobalTableConfig
                  : undefined
              }
            />
            {/* Mounted only while open (kdd/action-modal): the candidates
                resource first fetches inside it. */}
            <Show when={editorOpen()}>
              <StockMovementLineEditModal
                storeId={params.storeId}
                movementId={n().id}
                line={editingLine()}
                addedStockLineIds={() => rows().map(l => l.stockLineId)}
                locations={locations}
                locationsLoading={() => locationsData.loading}
                onSaved={onLinesChanged}
                onClose={() => setEditorOpen(false)}
              />
            </Show>
          </Page>
        )}
      </Show>
    </Suspense>
  );
};

export default StockMovementDetailView;
