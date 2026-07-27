import {
  createResource,
  createSignal,
  Show,
  Suspense,
  type Component,
} from 'solid-js';
import { useNavigate, useParams } from '@solidjs/router';
import { graphqlFetch } from '../../../api/graphql';
import { t } from '../../../intl';
import { Page } from '../../../ui/layout/Page/Page';
import { Header } from '../../../ui/layout/Header/Header';
import { Breadcrumb } from '../../../ui/layout/Header/Breadcrumb';
import { HeaderButtons } from '../../../ui/layout/Header/HeaderButtons';
import { Toolbar } from '../../../ui/layout/Header/Toolbar';
import { createSidePanelOpen } from '../../../ui/layout/SidePanel/createSidePanelOpen';
import { Spinner } from '../../../ui/elements/feedback/Spinner';
import { Button } from '../../../ui/elements/buttons/Button';
import { SidebarIcon } from '../../../ui/icons';
import { ConfirmDialog } from '../../../ui/elements/feedback/ConfirmDialog';
import { Tabs, TabList, TabPanel } from '../../../ui/elements/tabs/Tabs';
import {
  DataTable,
  type Column,
  type SortState,
} from '../../../ui/elements/table/DataTable';
import {
  getCommentCell,
  getCurrencyCell,
  getNumberCell,
} from '../../../ui/elements/table/tableHelpers';
import { AlertTriangleIcon } from '../../../ui/icons';
import { createTableConfig } from '../../../api/createTableConfig';
import { createDebouncedEdit } from '../../../domain/debouncedEdit';
import {
  InternalOrderDetail,
  type InternalOrderInfoFragment,
  type InternalOrderLineFragment,
} from './internalOrderDetail.generated';
import { InternalOrderDetailContext } from './detailContext.generated';
import { saveInternalOrderFields } from './internalOrderUpdate';
import { isOrderEditable } from './internalOrderDetailStatus';
import {
  InternalOrderToolbar,
  type HeaderEditFields,
} from './InternalOrderToolbar';
import { InternalOrderStatusFooter } from './InternalOrderStatusFooter';
import { InternalOrderLogTab } from './InternalOrderLogTab';
import { InternalOrderSidePanel } from './InternalOrderSidePanel';
import { InternalOrderDocumentsTab } from './InternalOrderDocumentsTab';
import { ExportPrintInternalOrderAction } from './actions/ExportPrintInternalOrderAction';

// The internal-order detail view (spec/internal-orders S3): view, header edits,
// send, the side panel (S5), the Documents tab, and Export/Print (reports S4).
// The line editor (S4), master-list picker (S7), the Indicators tab, and the
// ancillary Add/Update actions are out of this cut.
//
// ⚠️ Interim: the line table reads the NESTED `lines` connection with
// CLIENT-side filter/sort — the spec's server-paginated `requisitionLines`
// query does not exist yet (a backend gap, PR #12526; see contract.md
// § "Backend gaps"). It moves server-side once the PR lands.

type Line = InternalOrderLineFragment;

// The client-side sort keys the read-only line table supports.
type SortKey =
  | 'code'
  | 'name'
  | 'available'
  | 'amc'
  | 'mos'
  | 'target'
  | 'suggested'
  | 'requested';

const InternalOrderDetailView: Component = () => {
  const params = useParams<{ storeId: string; orderId: string }>();
  const navigate = useNavigate();
  const [itemFilter, setItemFilter] = createSignal('');
  const [hideOverMin, setHideOverMin] = createSignal(false);
  const [sort, setSort] = createSignal<SortState<SortKey>>({
    key: 'name',
    desc: false,
  });
  const [supplierError, setSupplierError] = createSignal<string>();
  const [sidePanelOpen, setSidePanelOpen] = createSidePanelOpen();

  const tableConfig = createTableConfig({
    tableId: 'internal-order-detail',
    defaultConfig: {
      compact: {
        viewMode: 'card',
        columnVisibility: { unitName: false, dps: false, targetStock: false },
      },
    },
  });

  // The header read. The resource IS the local state: every save writes back
  // with `mutate` (no refetch → no suspend → no remount,
  // kdd/solid-reactivity-pitfalls). Reading `data()` suspends only on the
  // screen's FIRST load (nothing live to lose), under the <Suspense> below.
  const [data, { mutate, refetch }] = createResource(
    () => ({ storeId: params.storeId, id: params.orderId }),
    async (variables): Promise<InternalOrderInfoFragment | undefined> => {
      const result = await graphqlFetch(InternalOrderDetail, variables);
      if (result.kind !== 'success') return undefined;
      return result.data.requisition.__typename === 'RequisitionNode'
        ? result.data.requisition
        : undefined;
    }
  );
  const info = (): InternalOrderInfoFragment | undefined => data();

  // Store-context gates, fetched once per store, read non-suspending (safe
  // default OFF while unresolved).
  const [context] = createResource(
    () => params.storeId,
    async storeId => {
      const result = await graphqlFetch(InternalOrderDetailContext, {
        storeId,
      });
      if (result.kind !== 'success') return undefined;
      return result.data;
    }
  );
  const prefs = () => context.latest?.preferences;
  const storePrefs = () => context.latest?.storePreferences;
  const showDoses = () => prefs()?.manageVaccinesInDoses ?? false;
  const showPricing = () => prefs()?.showIndicativePriceInRequisitions ?? false;
  const showForecast = () =>
    prefs()?.displayPopulationBasedForecasting ?? false;
  const showExcess = () => prefs()?.warningForExcessRequest ?? false;
  const showDestination = () =>
    prefs()?.selectDestinationStoreForAnInternalOrder ?? false;
  const requiresAuth = () =>
    storePrefs()?.requestRequisitionRequiresAuthorisation ?? false;
  // The extended consumption columns / Area-AMC header: a program order on a
  // customer-statistics store.
  const showExtended = () =>
    !!info()?.program &&
    (storePrefs()?.useConsumptionAndStockFromCustomersForInternalOrders ??
      false);
  const showApproval = () =>
    requiresAuth() && (info()?.approvalStatus ?? 'NONE') !== 'NONE';
  // The side panel's "Created from requisition" row (display-only, AC-RD2).
  const showSourceLink = () =>
    prefs()?.canCreateInternalOrderFromARequisition ?? false;
  // Documents upload/remove are offered on any status, but withheld when the
  // supplier's store is disabled (AC-F2/F5).
  const supplierEnabled = () => !info()?.otherParty.store?.isDisabled;

  const editable = () => {
    const node = info();
    return node ? isOrderEditable(node) : false;
  };
  const isProgram = () => !!info()?.program;

  // ONE debounced buffer for the as-you-type reference (comment rides the same
  // buffer for the side panel / send, out of this cut).
  const edit = createDebouncedEdit<HeaderEditFields>({
    id: () => info()?.id ?? '',
    initial: () => ({
      theirReference: info()?.theirReference ?? '',
      comment: info()?.comment ?? '',
    }),
    save: patch => void saveField(patch),
  });

  // Header-level save (updateRequestRequisition), spliced back wholesale — the
  // response carries the refreshed node (with recalculated suggestions after a
  // threshold change), so no refetch is needed.
  const saveField = async (
    patch: Record<string, unknown>
  ): Promise<void> => {
    const node = info();
    if (!node) return;
    const result = await saveInternalOrderFields(params.storeId, {
      id: node.id,
      ...patch,
    });
    if (result.kind === 'saved') mutate(() => result.node);
    if (result.kind === 'error') setSupplierError(result.message);
  };

  const changeSupplier = (supplierId: string) => {
    setSupplierError(undefined);
    void saveField({ otherPartyId: supplierId });
  };
  const changeDestination = (customerId: string | null) =>
    void saveField({ destinationCustomerId: { value: customerId } });
  const changeThreshold = (months: number) =>
    void saveField({ minMonthsOfStock: months });
  const changeTarget = (months: number) =>
    void saveField({ maxMonthsOfStock: months });

  const onSent = (node: InternalOrderInfoFragment) => mutate(() => node);

  // --- Read-only line table: client-side filter + sort over nested lines. ---

  const monthsThreshold = (node: InternalOrderInfoFragment) =>
    node.minMonthsOfStock > 0 ? node.minMonthsOfStock : node.maxMonthsOfStock;

  const mos = (line: Line) =>
    line.averageMonthlyConsumption > 0
      ? line.availableStockOnHand / line.averageMonthlyConsumption
      : 0;
  const targetStock = (line: Line) =>
    line.averageMonthlyConsumption * (info()?.maxMonthsOfStock ?? 0);
  const isExcess = (line: Line) =>
    showExcess() && line.requestedQuantity - line.suggestedQuantity >= 1;

  const sortValue = (line: Line, key: SortKey): number | string => {
    switch (key) {
      case 'code':
        return line.item.code.toLowerCase();
      case 'name':
        return line.itemName.toLowerCase();
      case 'available':
        return line.availableStockOnHand;
      case 'amc':
        return line.averageMonthlyConsumption;
      case 'mos':
        return mos(line);
      case 'target':
        return targetStock(line);
      case 'suggested':
        return line.suggestedQuantity;
      case 'requested':
        return line.requestedQuantity;
    }
  };

  const rows = (): Line[] => {
    const node = info();
    if (!node) return [];
    let lines = node.lines.nodes;
    const f = itemFilter().trim().toLowerCase();
    if (f)
      lines = lines.filter(
        l =>
          l.item.code.toLowerCase().includes(f) ||
          l.itemName.toLowerCase().includes(f)
      );
    if (hideOverMin()) {
      const months = monthsThreshold(node);
      lines = lines.filter(
        l =>
          l.availableStockOnHand < l.averageMonthlyConsumption * months ||
          (l.availableStockOnHand === 0 && l.averageMonthlyConsumption === 0)
      );
    }
    const s = sort();
    const dir = s.desc ? -1 : 1;
    return [...lines].sort((a, b) => {
      const av = sortValue(a, s.key);
      const bv = sortValue(b, s.key);
      return av < bv ? -dir : av > bv ? dir : 0;
    });
  };

  // Dose annotation for a unit quantity on a vaccine item under the doses
  // preference — " (N ds)" (label.doses-short), value × doses-per-unit (treated
  // as 1 when the item has none, so the annotation shows for any vaccine).
  const doseSuffix = (line: Line, value: number): string =>
    showDoses() && line.item.isVaccine
      ? ` (${Math.round(value * (line.item.doses || 1))} ${t('label.doses-short')})`
      : '';
  const numWithDoses = (line: Line, value: number) =>
    `${Math.round(value)}${doseSuffix(line, value)}`;

  const crumbs = (node: InternalOrderInfoFragment) => [
    { label: t('replenishment') },
    {
      label: t('internal-order'),
      onClick: () =>
        navigate(`/${params.storeId}/replenishment/internal-order`),
    },
    { label: String(node.requisitionNumber) },
  ];

  const columns = (): Column<Line, SortKey>[] => [
    {
      c: { key: 'comment' },
      header: () => t('label.comment'),
      ...getCommentCell(),
    },
    {
      c: { accessor: line => line.item.code, id: 'code' },
      sortKey: 'code',
      header: () => t('label.code'),
    },
    {
      c: { key: 'itemName' },
      sortKey: 'name',
      header: () => t('label.name'),
      meta: { headerPosition: 'primary', wrapLines: 2 },
    },
    {
      c: { accessor: line => line.item.unitName ?? '', id: 'unitName' },
      header: () => t('label.unit'),
    },
    // Doses per unit — gated on the vaccine-doses preference; a dash for
    // non-vaccine items.
    ...(showDoses()
      ? ([
          {
            c: {
              accessor: line => (line.item.isVaccine ? line.item.doses : '-'),
              id: 'dosesPerUnit',
            },
            header: () => t('label.doses-per-unit'),
          },
        ] satisfies Column<Line, SortKey>[])
      : []),
    {
      c: { accessor: line => line.item.defaultPackSize, id: 'dps' },
      sortKey: undefined,
      header: () => t('label.dps'),
      ...getNumberCell(),
    },
    {
      c: {
        accessor: line => numWithDoses(line, line.availableStockOnHand),
        id: 'available',
      },
      sortKey: 'available',
      header: () => t('label.available-soh'),
    },
    {
      // AMC displayed rounded UP; header reads "Area AMC" under the gate.
      c: {
        accessor: line =>
          numWithDoses(line, Math.ceil(line.averageMonthlyConsumption)),
        id: 'amc',
      },
      sortKey: 'amc',
      header: () => (showExtended() ? t('label.area-amc') : t('label.amc')),
    },
    {
      c: { accessor: line => mos(line).toFixed(1), id: 'mos' },
      sortKey: 'mos',
      header: () => t('label.months-of-stock'),
    },
    {
      c: {
        accessor: line => numWithDoses(line, targetStock(line)),
        id: 'targetStock',
      },
      sortKey: 'target',
      header: () => t('label.target-stock'),
    },
    // Target stock (population) — gated on the forecasting preference; the
    // stored forecast rounded up, zero on a forecast-less line.
    ...(showForecast()
      ? ([
          {
            c: {
              accessor: line =>
                numWithDoses(line, Math.ceil(line.forecastTotalUnits ?? 0)),
              id: 'targetStockPopulation',
            },
            header: () => t('label.target-stock-population'),
          },
        ] satisfies Column<Line, SortKey>[])
      : []),
    {
      c: {
        accessor: line => numWithDoses(line, line.suggestedQuantity),
        id: 'suggested',
      },
      sortKey: 'suggested',
      // The reference keys this column "forecast quantity" (cite it).
      header: () => t('label.forecast-quantity'),
    },
    {
      // Requested — under the excess-request preference a request ≥ 1 unit
      // above the suggestion carries a red alert icon (the line-table
      // counterpart of the editor banner).
      c: {
        accessor: line => numWithDoses(line, line.requestedQuantity),
        id: 'requested',
      },
      sortKey: 'requested',
      header: () => t('label.requested'),
      cell: info => {
        const line = info.row.original;
        return (
          <span
            style={{
              display: 'inline-flex',
              'align-items': 'center',
              gap: 'var(--space-1)',
            }}
          >
            <Show when={isExcess(line)}>
              <AlertTriangleIcon
                style={{ color: 'var(--error-main)' }}
                aria-label={t('label.requested')}
              />
            </Show>
            {numWithDoses(line, line.requestedQuantity)}
          </span>
        );
      },
    },
    // Indicative pricing — gated on the preference.
    ...(showPricing()
      ? ([
          {
            c: {
              accessor: line => line.pricePerUnit ?? '',
              id: 'pricePerUnit',
            },
            header: () => t('label.indicative-price-per-unit'),
            ...getCurrencyCell(),
          },
          {
            c: {
              accessor: line =>
                (line.pricePerUnit ?? 0) * line.requestedQuantity,
              id: 'indicativePrice',
            },
            header: () => t('label.indicative-price'),
            ...getCurrencyCell(),
          },
        ] satisfies Column<Line, SortKey>[])
      : []),
    // Extended consumption columns — program order on a customer-statistics
    // store.
    ...(showExtended()
      ? ([
          {
            c: { accessor: l => numWithDoses(l, l.initialStockOnHandUnits), id: 'initialSoh' },
            header: () => t('label.initial-stock-on-hand'),
          },
          {
            c: { accessor: l => numWithDoses(l, l.incomingUnits), id: 'incoming' },
            header: () => t('label.incoming'),
          },
          {
            c: { accessor: l => numWithDoses(l, l.outgoingUnits), id: 'outgoing' },
            header: () => t('label.outgoing'),
          },
          {
            c: { accessor: l => numWithDoses(l, l.lossInUnits), id: 'losses' },
            header: () => t('label.losses'),
          },
          {
            c: { accessor: l => numWithDoses(l, l.additionInUnits), id: 'additions' },
            header: () => t('label.additions'),
          },
          {
            c: { accessor: l => Math.round(l.expiringUnits), id: 'shortExpiry' },
            header: () => t('label.short-expiry'),
          },
          {
            c: { accessor: l => Math.round(l.daysOutOfStock), id: 'daysOutOfStock' },
            header: () => t('label.days-out-of-stock'),
          },
          {
            c: { accessor: l => l.reason?.reason ?? '', id: 'reason' },
            header: () => t('label.reason'),
          },
        ] satisfies Column<Line, SortKey>[])
      : []),
    // Approval columns — only when the linked copy carries an approval status.
    ...(showApproval()
      ? ([
          {
            c: { accessor: l => Math.round(l.approvedQuantity), id: 'approvedPacks' },
            header: () => t('label.approved-packs'),
          },
          {
            c: { accessor: l => l.approvalComment ?? '', id: 'approvalComment' },
            header: () => t('label.approval-comment'),
          },
        ] satisfies Column<Line, SortKey>[])
      : []),
  ];

  return (
    <Suspense fallback={<Spinner center />}>
      {/* NON-keyed Show: every save sets a fresh node object; a keyed Show would
          remount the page and drop focus. */}
      <Show
        when={info()}
        fallback={
          <Show when={!data.loading} fallback={<Spinner center />}>
            {/* Not found (or another store's) — a blocking notice returning to
                the list (AC-N3). */}
            <ConfirmDialog
              open
              title={t('error.order-not-found')}
              message={t('messages.click-to-return-to-internal-orders')}
              confirmLabel={t('button.ok')}
              onConfirm={() =>
                navigate(`/${params.storeId}/replenishment/internal-order`, {
                  replace: true,
                })
              }
              onClose={() =>
                navigate(`/${params.storeId}/replenishment/internal-order`, {
                  replace: true,
                })
              }
            />
          </Show>
        }
      >
        {node => (
          <Page
            fillBody
            sidePanelOpen={sidePanelOpen()}
            sidePanelTitle={t('heading.details')}
            onSidePanelClose={() => setSidePanelOpen(false)}
            sidePanelContent={
              <InternalOrderSidePanel
                storeId={params.storeId}
                node={node()}
                editable={editable()}
                isProgram={isProgram()}
                showApproval={showApproval()}
                showPricing={showPricing()}
                showSourceLink={showSourceLink()}
                edit={edit}
                onSaveField={patch => void saveField(patch)}
                onDeleted={() =>
                  navigate(
                    `/${params.storeId}/replenishment/internal-order`,
                    { replace: true }
                  )
                }
              />
            }
            header={
              <Header>
                <Breadcrumb crumbs={crumbs(node())} />
                <HeaderButtons>
                  {/* Export/Print — a read, offered on every status (AC-PR1). */}
                  <ExportPrintInternalOrderAction orderId={node().id} />
                  {/* More — reopens the side panel; shown only while closed. */}
                  <Show when={!sidePanelOpen()}>
                    <Button
                      variant="secondary"
                      icon={<SidebarIcon />}
                      data-testid="open-detail-panel-button"
                      onClick={() => setSidePanelOpen(true)}
                    >
                      {t('button.more')}
                    </Button>
                  </Show>
                </HeaderButtons>
                <Toolbar>
                  <InternalOrderToolbar
                    storeId={params.storeId}
                    node={node()}
                    editable={editable()}
                    isProgram={isProgram()}
                    showDestination={showDestination()}
                    edit={edit}
                    onChangeSupplier={changeSupplier}
                    supplierError={supplierError()}
                    onChangeDestination={changeDestination}
                    onChangeThreshold={changeThreshold}
                    onChangeTarget={changeTarget}
                    hideOverMin={hideOverMin()}
                    onHideOverMinChange={setHideOverMin}
                    itemFilter={itemFilter()}
                    onItemFilterChange={setItemFilter}
                  />
                </Toolbar>
              </Header>
            }
            contentFooter={
              <InternalOrderStatusFooter
                storeId={params.storeId}
                node={node()}
                editable={editable()}
                onSent={onSent}
              />
            }
          >
            {/* Details | Documents | Log (spec S3 § tabs). Indicators is out of
                this cut. */}
            <Tabs defaultValue="details">
              <TabList
                tabs={[
                  { value: 'details', label: t('label.details') },
                  { value: 'documents', label: t('label.documents') },
                  { value: 'log', label: t('label.log') },
                ]}
              />
              <TabPanel value="details">
                <DataTable
                  columns={columns()}
                  rows={rows()}
                  rowKey={line => line.id}
                  loading={data.loading}
                  sort={sort()}
                  onSort={(key, desc) => setSort({ key, desc })}
                  emptyMessage={
                    itemFilter().trim()
                      ? t('error.no-items-filter-on')
                      : t('error.no-internal-order-items')
                  }
                  config={tableConfig.config()}
                  setConfig={tableConfig.setConfig}
                />
              </TabPanel>
              <TabPanel value="documents">
                <InternalOrderDocumentsTab
                  storeId={params.storeId}
                  node={node()}
                  supplierEnabled={supplierEnabled()}
                  onChanged={() => void refetch()}
                />
              </TabPanel>
              <TabPanel value="log">
                <InternalOrderLogTab
                  storeId={params.storeId}
                  recordId={node().id}
                />
              </TabPanel>
            </Tabs>
          </Page>
        )}
      </Show>
    </Suspense>
  );
};

export default InternalOrderDetailView;
