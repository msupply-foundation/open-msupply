import {
  createMemo,
  createResource,
  createSignal,
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
import {
  Tabs,
  TabList,
  TabPanel,
  type TabDef,
} from '../../../ui/elements/tabs/Tabs';
import { Button } from '../../../ui/elements/buttons/Button';
import { SplitButton } from '../../../ui/elements/buttons/SplitButton';
import { Spinner } from '../../../ui/elements/feedback/Spinner';
import { CloseIcon, InfoIcon, TruckIcon } from '../../../ui/icons';
import {
  DataTable,
  type Column,
  type SortState,
} from '../../../ui/elements/table/DataTable';
import {
  getCurrencyCell,
  getDateCell,
  getNumberCell,
} from '../../../ui/elements/table/tableHelpers';
import { createTableConfig } from '../../../api/createTableConfig';
import { useUrlQueryState } from '../../../list/urlQueryState';
import { stripEmpty } from '../../../typeHelpers';
import { createDebouncedEdit } from '../../../domain/debouncedEdit';
import { fetchLocations, type Location } from '../../../domain/location';
import { inboundShipmentPreferences } from '../../../store/storeContext';
import {
  InboundShipment,
  InboundShipmentLines,
  type InboundInfoFragment,
  type InboundLineFragment,
  type InboundShipmentLinesVariables,
} from './inboundShipmentDetail.generated';
import type { UpdateInboundShipmentVariables } from './inboundShipmentDetail.generated';
import {
  isExternalShipment,
  saveInboundShipmentFields,
  type InboundLineErrors,
} from './inboundShipmentUpdate';
import { kindOf, supplierIsStore } from './inboundShipmentStatus';
import type { InboundEditFields } from './inboundShipmentEdit';
import type { InboundLineFilter } from './inboundShipmentLineFilter';
import { InboundShipmentDetailToolbar } from './InboundShipmentDetailToolbar';
import { InboundShipmentSidePanel } from './InboundShipmentSidePanel';
import { InboundShipmentStatusFooter } from './InboundShipmentStatusFooter';
import { InboundShipmentLogPanel } from './log/InboundShipmentLogPanel';
import { InboundDocumentsPanel } from './tabs/InboundDocumentsPanel';
import { InboundCurrencyPanel } from './tabs/InboundCurrencyPanel';
import { InboundFinancialPanel } from './tabs/InboundFinancialPanel';
import { InboundDeliveryPanel } from './tabs/InboundDeliveryPanel';
import { InboundShipmentLineEditModal } from './edit-modal/InboundShipmentLineEditModal';
import { AddFromMasterListModal } from './modals/AddFromMasterListModal';
import { AddFromInternalOrderModal } from './modals/AddFromInternalOrderModal';
import {
  DeleteLinesAction,
  ZeroLineQuantityAction,
  ChangeLocationAction,
  AuthoriseLinesAction,
  ChangeCampaignProgramAction,
  ExportPrintAction,
} from './actions';

// The inbound-shipment detail view (spec S3). Mirrors the stocktake detail
// reference: TWO resources — `info` (header/footer/side-panel, a single node,
// spliced in place on a header save) and `lines` (one server-paginated page of
// STOCK_IN lines, refetched on any line change). A Verified shipment is
// read-only (the global edit gate); on-hold blocks only status changes.

type Line = InboundLineFragment;
type SortKey = NonNullable<
  InboundShipmentLinesVariables['sort']
>[number]['key'];

const DEFAULT_PAGE_SIZE = 20;

type DetailUrlState = {
  filter: InboundLineFilter;
  sort: NonNullable<InboundShipmentLinesVariables['sort']>;
  offset: number;
  first: number;
};
const DEFAULT_URL_STATE: DetailUrlState = {
  filter: {},
  sort: [{ key: 'itemName', desc: false }],
  offset: 0,
  first: DEFAULT_PAGE_SIZE,
};

const InboundShipmentDetailView: Component = () => {
  const params = useParams<{ storeId: string; invoiceId: string }>();
  const navigate = useNavigate();
  const { query, setQuery } =
    useUrlQueryState<DetailUrlState>(DEFAULT_URL_STATE);
  const filter = () => query().filter;

  const [selectedIds, setSelectedIds] = createSignal<string[]>([]);
  const [sidePanelOpen, setSidePanelOpen] = createSignal(false);
  const [lineErrors, setLineErrors] = createSignal<InboundLineErrors>(
    new Map()
  );
  const [activeTab, setActiveTab] = createSignal('details');
  // The line-edit modal open state: { itemId } to edit an item's batches, {}
  // to add a new item, undefined = closed.
  const [editState, setEditState] = createSignal<{ itemId?: string }>();
  const [masterListOpen, setMasterListOpen] = createSignal(false);
  const [internalOrderOpen, setInternalOrderOpen] = createSignal(false);

  const prefs = () => inboundShipmentPreferences();

  const tableConfig = createTableConfig({
    tableId: 'inbound-shipment-detail',
    defaultConfig: {
      base: {
        columnVisibility: {
          manufactureDate: false,
          manufacturer: false,
          note: false,
          sellPricePerPack: false,
        },
      },
    },
  });

  // Header/side-panel/footer node. A NodeError (bad id) is promoted to the
  // global unexpected-error modal.
  const [data, { mutate, refetch: refetchInfo }] = createResource(
    () => ({ storeId: params.storeId, id: params.invoiceId }),
    async variables => {
      const result = await graphqlFetch(InboundShipment, variables, {
        mapSuccessToError: d =>
          d.invoice.__typename === 'NodeError'
            ? d.invoice.error.description
            : undefined,
      });
      if (result.kind !== 'success') return undefined;
      return result.data.invoice.__typename === 'InvoiceNode'
        ? result.data.invoice
        : undefined;
    }
  );
  const info = (): InboundInfoFragment | undefined => data();

  // One server-paginated page of STOCK_IN lines (invoiceId + type forced;
  // user filter/sort/page from the URL). Keyed on serialised variables so
  // identical content doesn't refetch.
  const linesVariables = createMemo<InboundShipmentLinesVariables>(() => ({
    storeId: params.storeId,
    filter: {
      ...stripEmpty(query().filter),
      invoiceId: { equalTo: params.invoiceId },
      type: { equalTo: 'STOCK_IN' },
    },
    sort: query().sort,
    page: { first: query().first, offset: query().offset },
  }));
  const [linesData, { refetch: refetchLines }] = createResource(
    () => JSON.stringify(linesVariables()),
    async serialised => {
      const result = await graphqlFetch(
        InboundShipmentLines,
        JSON.parse(serialised) as InboundShipmentLinesVariables
      );
      if (result.kind !== 'success') return undefined;
      return result.data.invoiceLines.__typename === 'InvoiceLineConnector'
        ? result.data.invoiceLines
        : undefined;
    }
  );
  const rows = (): Line[] => linesData.latest?.nodes ?? [];
  const totalCount = () => linesData.latest?.totalCount ?? 0;

  const [locationsData] = createResource(params.storeId, fetchLocations);
  const locations = (): Location[] => locationsData.latest ?? [];

  const current = () => info();
  const isDisabled = () => current()?.status === 'VERIFIED';
  const isExternal = () => (current() ? isExternalShipment(current()!) : false);
  const existingItemIds = () => rows().map(r => r.itemId);

  const refetchAll = () => {
    void refetchInfo();
    void refetchLines();
  };

  // Header field save → updateInboundShipment (twin by isExternal) → splice.
  const saveField = async (
    patch: Partial<Omit<UpdateInboundShipmentVariables['input'], 'id'>>
  ) => {
    const node = current();
    if (!node) return;
    const saved = await saveInboundShipmentFields(
      params.storeId,
      isExternal(),
      {
        id: node.id,
        ...patch,
      }
    );
    if (saved) {
      mutate(prev => (prev ? { ...prev, ...saved } : prev));
      // A tax/currency/charge change cascades to line costs — refetch the page.
      void refetchLines();
    }
  };

  const edit = createDebouncedEdit<InboundEditFields>({
    id: () => current()?.id ?? '',
    initial: () => ({
      theirReference: current()?.theirReference ?? '',
      comment: current()?.comment ?? '',
    }),
    save: patch => void saveField(patch),
  });

  const setHold = (hold: boolean) => void saveField({ onHold: hold });
  const onAdvanced = (saved: InboundInfoFragment) => {
    mutate(prev => (prev ? { ...prev, ...saved } : prev));
    void refetchLines();
  };
  const onNodeSaved = (saved: InboundInfoFragment) =>
    mutate(prev => (prev ? { ...prev, ...saved } : prev));

  const onDeleted = () =>
    navigate(`/${params.storeId}/replenishment/inbound-shipment`, {
      replace: true,
    });

  const onLinesChanged = () => {
    setSelectedIds([]);
    setLineErrors(new Map());
    refetchAll();
  };
  const stampErrors = (errors: InboundLineErrors) =>
    setLineErrors(new Map(errors));

  const currentSort = (): SortState<SortKey> | undefined => {
    const s = query().sort[0];
    return s ? { key: s.key, desc: s.desc ?? false } : undefined;
  };
  const onSort = (key: SortKey, desc: boolean) =>
    setQuery({ ...query(), sort: [{ key, desc }], offset: 0 });
  const onFilterChange = (next: InboundLineFilter) => {
    setQuery({ ...query(), filter: next, offset: 0 });
    setSelectedIds([]);
  };

  const openRow = (line: Line) => setEditState({ itemId: line.itemId });
  const openAdd = () => setEditState({});

  // "OK & next" (edit mode): advance the editor to the next distinct item on
  // the shipment after the current one (the view owns the row list); close when
  // exhausted. Walks the loaded page (inbound line sets are typically one page).
  const advanceToNextItem = (currentItemId: string) => {
    const items = [...new Set(rows().map(r => r.itemId))];
    const idx = items.indexOf(currentItemId);
    const next = idx >= 0 ? items[idx + 1] : undefined;
    setEditState(next ? { itemId: next } : undefined);
  };

  const reportSort = () => {
    const s = query().sort[0];
    return s ? { key: s.key, desc: s.desc ?? false } : undefined;
  };

  // Financial / Currency / Delivery are PO-linked-only tabs (spec S3 tabs).
  const tabs = (): TabDef[] => [
    { value: 'details', label: t('label.details') },
    ...(isExternal()
      ? [
          { value: 'financial', label: t('label.financial') },
          { value: 'currency', label: t('label.currency') },
          { value: 'delivery', label: t('label.delivery') },
        ]
      : []),
    { value: 'documents', label: t('label.documents') },
    { value: 'log', label: t('label.log') },
  ];

  const crumbs = (node: InboundInfoFragment) => [
    {
      label: t('inbound-shipment'),
      onClick: () =>
        navigate(`/${params.storeId}/replenishment/inbound-shipment`),
    },
    { label: String(node.invoiceNumber) },
  ];

  // Add-item split button options — master list & internal order gated (spec
  // AC-ML1 / AC-PG4). "Add from internal order" is deferred (flagged).
  const addOptions = () => {
    const node = current();
    const opts = [{ value: 'item', label: t('button.add-item') }];
    if (node && node.status === 'NEW' && !isExternal())
      opts.push({
        value: 'masterList',
        label: t('label.add-from-master-list'),
      });
    // Add-from-internal-order — store allows the manual link, the shipment has
    // a linked internal order, and it isn't a transfer (spec AC-PG4 / AC-IO1).
    if (
      node?.requisition &&
      prefs().manuallyLinkInternalOrderToInboundShipment &&
      kindOf(node) !== 'transfer'
    )
      opts.push({
        value: 'internalOrder',
        label: t('label.add-from-internal-order'),
      });
    return opts;
  };
  const onAddAction = (value: string) => {
    if (value === 'masterList') setMasterListOpen(true);
    else if (value === 'internalOrder') setInternalOrderOpen(true);
    else openAdd();
  };

  const columns = (node: InboundInfoFragment): Column<Line, SortKey>[] => {
    const isManual = !isExternalShipment(node);
    return [
      {
        c: { accessor: line => line.itemCode, id: 'itemCode' },
        sortKey: 'itemCode',
        header: t('label.code'),
      },
      {
        c: { key: 'itemName' },
        sortKey: 'itemName',
        header: t('label.name'),
        meta: { card: { region: 'primary' }, wrapLines: 2 },
      },
      // PO line number — PO-linked shipments only.
      ...(isExternalShipment(node)
        ? [
            {
              c: {
                accessor: line => line.purchaseOrderLine?.lineNumber ?? '',
                id: 'poLine',
              },
              header: t('label.po-line-number'),
              ...getNumberCell(),
            } satisfies Column<Line, SortKey>,
          ]
        : []),
      { c: { key: 'batch' }, sortKey: 'batch', header: t('label.batch') },
      {
        c: { key: 'expiryDate' },
        sortKey: 'expiryDate',
        header: t('label.expiry'),
        ...getDateCell(),
      },
      // VVM status — gated by the store preference.
      ...(prefs().manageVvmStatusForStock
        ? [
            {
              c: {
                accessor: line => line.vvmStatus?.description ?? '',
                id: 'vvmStatus',
              },
              header: t('label.vvm-status'),
            } satisfies Column<Line, SortKey>,
          ]
        : []),
      {
        c: { accessor: line => line.location?.code ?? '', id: 'location' },
        sortKey: 'locationName',
        header: t('label.location'),
      },
      {
        c: { key: 'packSize' },
        sortKey: 'packSize',
        header: t('label.pack-size'),
        ...getNumberCell(),
      },
      {
        c: { key: 'numberOfPacks' },
        header: t('label.pack-quantity'),
        ...getNumberCell(),
        meta: { align: 'right', card: { region: 'badge' } },
      },
      // Auth status — gated by the authorisation preference.
      ...(prefs().externalInboundShipmentLinesMustBeAuthorised
        ? [
            {
              c: { accessor: line => line.status ?? '', id: 'authStatus' },
              header: t('label.status'),
            } satisfies Column<Line, SortKey>,
          ]
        : []),
      // Prices — manual shipments only (PO-linked derive from the order).
      ...(isManual
        ? [
            {
              c: { key: 'costPricePerPack' },
              header: t('label.pack-cost-price'),
              ...getCurrencyCell(),
            } satisfies Column<Line, SortKey>,
            {
              c: { key: 'sellPricePerPack' },
              header: t('label.pack-sell-price'),
              ...getCurrencyCell(),
            } satisfies Column<Line, SortKey>,
            {
              c: { accessor: line => line.totalAfterTax, id: 'total' },
              header: t('label.total'),
              ...getCurrencyCell(),
            } satisfies Column<Line, SortKey>,
          ]
        : []),
      // Donor — gated by the donor-tracking preference.
      ...(prefs().allowTrackingOfStockByDonor
        ? [
            {
              c: { accessor: line => line.donor?.name ?? '', id: 'donor' },
              header: t('label.donor'),
            } satisfies Column<Line, SortKey>,
          ]
        : []),
      {
        c: {
          accessor: line => line.manufacturer?.name ?? '',
          id: 'manufacturer',
        },
        header: t('label.manufacturer'),
      },
      {
        c: { key: 'manufactureDate' },
        header: t('label.manufacture-date'),
        ...getDateCell(),
      },
      { c: { key: 'note' }, header: t('label.note') },
    ];
  };

  return (
    <Suspense fallback={<Spinner center />}>
      <Show when={info()}>
        {node => (
          <Tabs value={activeTab()} onValueChange={setActiveTab}>
            <Page
              fillBody
              sidePanelOpen={sidePanelOpen()}
              sidePanelTitle={t('heading.details')}
              onSidePanelClose={() => setSidePanelOpen(false)}
              sidePanelContent={
                <InboundShipmentSidePanel
                  storeId={params.storeId}
                  node={node()}
                  disabled={isDisabled()}
                  isExternal={isExternal()}
                  edit={edit}
                  donorTracking={prefs().allowTrackingOfStockByDonor}
                  foreignCurrencyAllowed={prefs().issueInForeignCurrency}
                  onSaveField={saveField}
                  onSaved={onNodeSaved}
                  onRefetch={refetchAll}
                  onDeleted={onDeleted}
                />
              }
              header={
                <Header>
                  <Breadcrumb icon={<TruckIcon />} crumbs={crumbs(node())} />
                  <HeaderButtons>
                    <Show when={!isDisabled()}>
                      <SplitButton
                        options={addOptions()}
                        value="item"
                        testId="add-item"
                        menuLabel={t('button.add-item')}
                        onAction={onAddAction}
                      />
                    </Show>
                    <ExportPrintAction
                      invoiceId={node().id}
                      sort={reportSort()}
                    />
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
                    <InboundShipmentDetailToolbar
                      storeId={params.storeId}
                      node={node()}
                      disabled={isDisabled()}
                      edit={edit}
                      backdatingEnabled={prefs().backdatingEnabled}
                      backdatingMaxDays={prefs().backdatingMaxDays}
                      filter={filter()}
                      onFilterChange={onFilterChange}
                      onSaveField={saveField}
                    />
                  </Toolbar>
                  <TabList tabs={tabs()} />
                </Header>
              }
              contentFooter={
                <Show
                  when={selectedIds().length > 0}
                  fallback={
                    <InboundShipmentStatusFooter
                      storeId={params.storeId}
                      node={node()}
                      disabled={isDisabled()}
                      onSetHold={setHold}
                      onAdvanced={onAdvanced}
                    />
                  }
                >
                  <ContentFooter>
                    <strong>
                      {selectedIds().length} {t('label.selected')}
                    </strong>
                    <DeleteLinesAction
                      storeId={params.storeId}
                      isExternal={isExternal()}
                      selectedIds={selectedIds}
                      disabled={isDisabled()}
                      onChanged={onLinesChanged}
                      onError={stampErrors}
                    />
                    <ZeroLineQuantityAction
                      storeId={params.storeId}
                      isExternal={isExternal()}
                      selectedIds={selectedIds}
                      disabled={isDisabled()}
                      onChanged={onLinesChanged}
                      onError={stampErrors}
                    />
                    <ChangeLocationAction
                      storeId={params.storeId}
                      isExternal={isExternal()}
                      selectedIds={selectedIds}
                      disabled={isDisabled()}
                      locations={locations()}
                      onChanged={onLinesChanged}
                      onError={stampErrors}
                    />
                    <ChangeCampaignProgramAction
                      storeId={params.storeId}
                      isExternal={isExternal()}
                      selectedIds={selectedIds}
                      disabled={isDisabled()}
                      onChanged={onLinesChanged}
                      onError={stampErrors}
                    />
                    {/* Approve/Reject/Pending — only when the store requires
                        authorisation of these shipments' lines. */}
                    <Show
                      when={
                        prefs().externalInboundShipmentLinesMustBeAuthorised
                      }
                    >
                      <AuthoriseLinesAction
                        storeId={params.storeId}
                        isExternal={isExternal()}
                        selectedIds={selectedIds}
                        disabled={isDisabled()}
                        onChanged={onLinesChanged}
                        onError={stampErrors}
                      />
                    </Show>
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
              <TabPanel value="details">
                <DataTable
                  columns={columns(node())}
                  rows={rows()}
                  rowKey={line => line.id}
                  loading={linesData.loading}
                  sort={currentSort()}
                  onSort={onSort}
                  onRowClick={isDisabled() ? undefined : openRow}
                  rowTone={line =>
                    lineErrors().has(line.id) ? 'info' : undefined
                  }
                  emptyMessage={t('error.no-inbound-items')}
                  empty={
                    isDisabled() ? undefined : (
                      <Button
                        icon={<InfoIcon />}
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
                  onSaveGlobalDefault={
                    tableConfig.canSaveGlobalDefault()
                      ? tableConfig.saveGlobalTableConfig
                      : undefined
                  }
                  pagination={{
                    offset: query().offset,
                    pageSize: query().first,
                    total: totalCount(),
                    onOffsetChange: offset => setQuery({ ...query(), offset }),
                    onPageSizeChange: first =>
                      setQuery({ ...query(), first, offset: 0 }),
                  }}
                />
              </TabPanel>
              <Show when={isExternal()}>
                <TabPanel value="financial">
                  <InboundFinancialPanel rows={rows()} />
                </TabPanel>
                <TabPanel value="currency">
                  <InboundCurrencyPanel node={node()} />
                </TabPanel>
                <TabPanel value="delivery">
                  <InboundDeliveryPanel rows={rows()} />
                </TabPanel>
              </Show>
              <TabPanel value="documents">
                <InboundDocumentsPanel
                  node={node()}
                  disabled={isDisabled()}
                  onChanged={() => void refetchInfo()}
                />
              </TabPanel>
              <TabPanel value="log">
                <InboundShipmentLogPanel
                  storeId={params.storeId}
                  invoiceId={node().id}
                />
              </TabPanel>

              <InboundShipmentLineEditModal
                open={editState() != null}
                onClose={() => setEditState(undefined)}
                storeId={params.storeId}
                invoiceId={node().id}
                isExternal={isExternal()}
                initialItemId={editState()?.itemId}
                existingItemIds={existingItemIds()}
                purchaseOrderId={node().purchaseOrderId ?? undefined}
                costLocked={isExternal() || supplierIsStore(node())}
                locations={locations()}
                prefs={{
                  vvm: prefs().manageVvmStatusForStock,
                  donor: prefs().allowTrackingOfStockByDonor,
                }}
                onSaved={onLinesChanged}
                onRequestNext={advanceToNextItem}
              />
              <AddFromMasterListModal
                open={masterListOpen()}
                onClose={() => setMasterListOpen(false)}
                storeId={params.storeId}
                invoiceId={node().id}
                onAdded={onLinesChanged}
              />
              <Show when={node().requisition}>
                {req => (
                  <AddFromInternalOrderModal
                    open={internalOrderOpen()}
                    onClose={() => setInternalOrderOpen(false)}
                    storeId={params.storeId}
                    invoiceId={node().id}
                    requisitionId={req().id}
                    isExternal={isExternal()}
                    onAdded={onLinesChanged}
                  />
                )}
              </Show>
            </Page>
          </Tabs>
        )}
      </Show>
    </Suspense>
  );
};

export default InboundShipmentDetailView;
