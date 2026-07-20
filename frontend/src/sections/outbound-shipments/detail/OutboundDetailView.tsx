import {
  createEffect,
  createResource,
  createSignal,
  lazy,
  Show,
  Suspense,
} from 'solid-js';
import type { Component } from 'solid-js';
import { useNavigate, useParams } from '@solidjs/router';
import { graphqlFetch } from '../../../api/graphql';
import { t, tPlural } from '../../../intl';
import { Page } from '../../../ui/layout/Page/Page';
import { Header } from '../../../ui/layout/Header/Header';
import { Breadcrumb } from '../../../ui/layout/Header/Breadcrumb';
import { HeaderButtons } from '../../../ui/layout/Header/HeaderButtons';
import { Toolbar } from '../../../ui/layout/Header/Toolbar';
import { ContentFooter } from '../../../ui/layout/ContentFooter/ContentFooter';
import { ContentFooterActions } from '../../../ui/layout/ContentFooter/ContentFooterActions';
import { Button } from '../../../ui/elements/buttons/Button';
import { Spinner } from '../../../ui/elements/feedback/Spinner';
import { TextField } from '../../../ui/elements/inputs/TextField';
import { FieldRow } from '../../../ui/elements/inputs/FieldRow';
import { Tabs, TabList, TabPanel } from '../../../ui/elements/tabs/Tabs';
import {
  DataTable,
  type Column,
  sharedOrMultiple,
} from '../../../ui/elements/table/DataTable';
import {
  getCurrencyCell,
  getDateCell,
  getNumberCell,
} from '../../../ui/elements/table/tableHelpers';
import { createTableConfig } from '../../../api/createTableConfig';
import { createMediaQuery } from '../../../ui/utils/createMediaQuery';
import { Dialog } from '../../../ui/elements/feedback/Dialog';
import {
  CheckIcon,
  InfoIcon,
  MinusCircleIcon,
  PlusCircleIcon,
  PrinterIcon,
} from '../../../ui/icons';
import { CustomerSelect } from '../../../domain/customer';
import { createDebouncedEdit } from '../../../domain/debouncedEdit';
import {
  OutboundDetail,
  UpdateOutboundShipmentName,
  type OutboundLineFragment,
} from './outboundDetail.generated';
import { saveShipmentFields, type OutboundNode } from './outboundUpdate';
import type { OutboundEditFields } from './outboundEdit';
import { isEditable } from '../outboundStatus';
import { outboundPrefs } from '../outboundPreferencesResource';
import { OutboundStatusFooter } from './OutboundStatusFooter';
import { OutboundSidePanel } from './OutboundSidePanel';
import { LogTab } from './LogTab';
import {
  OutboundLineEditModal,
  type LineEditItem,
} from './edit-modal/OutboundLineEditModal';
import { ServiceChargesModal } from './service-charges/ServiceChargesModal';
// The record-screen report selector (reports S4): lazy-imported behind the
// Export/Print trigger per the reports section's bundle note — a static
// import would pull the selector graph into this section's eager chunk.
const ReportSelectorModal = lazy(() =>
  import('../../reports/selector/ReportSelectorModal').then(module => ({
    default: module.ReportSelectorModal,
  }))
);
import {
  AddFromMasterListAction,
  AllocateLinesAction,
  DeleteLinesAction,
} from './actions';

// The outbound-shipment detail view (spec/outbound-shipments S3): app-bar
// header (customer + customer reference), Details/Log tabs, the item-grouped
// read-only line table (row click opens the line editor S4 — AC-V1), the side
// panel (S3 § side panel), and the persistent status footer (hold / crumbs /
// status split button — AC-V2), replaced by the bulk line-action bar on
// selection. Line quantities are entered ONLY in the line editor.
//
// Data: one resource; header-field saves splice the returned node back
// (updateOutboundShipment returns header + lines — leaving NEW trims rows
// server-side); line-level operations refetch (totals, placeholders, and
// trims all move server-side — kdd/state-management: refresh by direct call).

type Line = OutboundLineFragment;

const OutboundDetailView: Component = () => {
  const params = useParams<{ storeId: string; invoiceId: string }>();
  const navigate = useNavigate();
  const [selectedIds, setSelectedIds] = createSignal<string[]>([]);
  // Side panel: auto-open on wide viewports, closed below (the responsive
  // detail-panel behaviour the shared e2e suites drive); the More button and
  // the panel's close re-take control until the breakpoint next flips.
  const isWide = createMediaQuery('(min-width: 1536px)');
  const [sidePanelOpen, setSidePanelOpen] = createSignal(false);
  createEffect(() => setSidePanelOpen(isWide()));

  // The line editor: add mode (item picker) or edit mode (a row's item).
  const [editorOpen, setEditorOpen] = createSignal(false);
  const [editorItem, setEditorItem] = createSignal<LineEditItem | undefined>();
  const [serviceOpen, setServiceOpen] = createSignal(false);
  // Customer-change rejection — shown on the lookup itself (controls › action
  // feedback: inline, keyed to its cause).
  const [customerError, setCustomerError] = createSignal<string>();
  // "Return selected lines" before SHIPPED — the AC-V3 explanatory notice.
  const [returnNoticeOpen, setReturnNoticeOpen] = createSignal(false);
  // Export/Print (S3 page action → reports S4, AC-E1–E3; any status).
  const [reportsOpen, setReportsOpen] = createSignal(false);

  const [data, { mutate, refetch }] = createResource(
    () => ({ storeId: params.storeId, id: params.invoiceId }),
    async variables => {
      const result = await graphqlFetch(OutboundDetail, variables, {
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

  // `.latest` (not `data()`): line ops refetch while the screen stays open,
  // and a suspending read would collapse the route's <Suspense> — unmounting
  // the table, footer, and any OPEN dialog (the line editor's "OK & next",
  // the allocate report) mid-interaction. `.latest` suspends only until the
  // FIRST load resolves, so the initial spinner is unchanged
  // (kdd/solid-reactivity-pitfalls § no remounts, rule 1).
  const node = (): OutboundNode | undefined => data.latest;
  const lines = (): Line[] => data.latest?.lines.nodes ?? [];
  const stockAndPlaceholderLines = () =>
    lines().filter(line => line.type !== 'SERVICE');
  const serviceLines = () => lines().filter(line => line.type === 'SERVICE');

  const editable = () => {
    const current = node();
    return current ? isEditable(current.status) : false;
  };

  // Footer inputs (spec S3 § status footer): the one client pre-flight is the
  // lineless server gap (AC-S6); other rejections surface from the server.
  const hasOnlyPlaceholders = () => {
    const stock = stockAndPlaceholderLines();
    return (
      stock.length > 0 && stock.every(line => line.type === 'UNALLOCATED_STOCK')
    );
  };
  const zeroQuantityItems = () =>
    stockAndPlaceholderLines()
      .filter(line => line.numberOfPacks === 0)
      .map(line => line.itemName);

  const tableConfig = createTableConfig({
    tableId: 'outbound-detail',
    defaultConfig: {
      base: {
        columnVisibility: {
          // The denser columns start hidden (spec S1's hidden-by-default idea
          // applied to the detail table); the user reveals them via column
          // settings. Received/difference matter for transfers only.
          unitName: false,
          receivedNumberOfPacks: false,
          difference: false,
          volumePerPack: false,
          locationCode: false,
        },
      },
    },
  });

  // ONE debounced buffer for the as-you-type text fields (toolbar customer
  // reference + side panel comment/transport reference) — bursts coalesce into
  // a single updateOutboundShipment (kdd/state-management).
  const edit = createDebouncedEdit<OutboundEditFields>({
    id: () => node()?.id ?? '',
    initial: () => ({
      theirReference: node()?.theirReference ?? '',
      comment: node()?.comment ?? '',
      transportReference: node()?.transportReference ?? '',
    }),
    save: patch => void saveField(patch),
  });

  const saveField = async (
    patch: Partial<Omit<Parameters<typeof saveShipmentFields>[1], 'id'>>
  ) => {
    const current = node();
    if (!current) return;
    const saved = await saveShipmentFields(params.storeId, {
      id: current.id,
      ...patch,
    });
    if (saved) mutate(() => saved);
  };

  const setHold = (hold: boolean) => void saveField({ onHold: hold });

  // Customer change (AC-N1): reissues under a NEW identity — renavigate to the
  // returned id. Blocked (UI) when the shipment came from a requisition
  // (AC-N2 — the lookup is disabled then, this is the backstop).
  const changeCustomer = async (customerId: string) => {
    const current = node();
    if (!current || customerId === current.otherParty.id) return;
    setCustomerError(undefined);
    const result = await graphqlFetch(UpdateOutboundShipmentName, {
      storeId: params.storeId,
      input: { id: current.id, otherPartyId: customerId },
    });
    if (result.kind !== 'success') return;
    const response = result.data.updateOutboundShipmentName;
    if (response.__typename !== 'InvoiceNode') {
      setCustomerError(response.error.description);
      return;
    }
    navigate(
      `/${params.storeId}/distribution/outbound-shipment/${response.id}`
    );
  };

  const onLineOpsCommitted = () => {
    setSelectedIds([]);
    void refetch();
  };

  // Row click → the line editor for that row's ITEM (AC-V1); disabled rows
  // (read-only shipment) get no handler at all.
  const openRow = (line: Line) => {
    if (line.type === 'SERVICE') {
      setServiceOpen(true);
      return;
    }
    setEditorItem({
      id: line.item.id,
      name: line.item.name,
      unitName: line.item.unitName,
      isVaccine: line.item.isVaccine,
      doses: line.item.doses,
    });
    setEditorOpen(true);
  };
  const openAdd = () => {
    setEditorItem(undefined);
    setEditorOpen(true);
  };

  const selectedLines = () =>
    stockAndPlaceholderLines()
      .concat(serviceLines())
      .filter(line => selectedIds().includes(line.id));

  const prefs = () => outboundPrefs()?.prefs;
  const dosesOn = () => prefs()?.manageVaccinesInDoses ?? false;
  const vvmOn = () => prefs()?.manageVvmStatusForStock ?? false;

  const crumbs = (current: OutboundNode) => [
    { label: t('nav.distribution') },
    {
      label: t('outbound.title'),
      onClick: () =>
        navigate(`/${params.storeId}/distribution/outbound-shipment`),
    },
    { label: String(current.invoiceNumber) },
  ];

  // The detail line table (spec S3 § line table): grouped by item — a group
  // row aggregates its batches; placeholder rows show the requested quantity.
  const columns = (): Column<Line, never>[] => [
    {
      c: { key: 'itemCode' },
      header: t('outbound.line.code'),
      aggregationFn: sharedOrMultiple,
    },
    {
      c: { key: 'itemName' },
      header: t('outbound.line.name'),
      meta: { card: { region: 'primary' }, wrapLines: 2 },
      aggregationFn: sharedOrMultiple,
    },
    {
      c: {
        accessor: line =>
          line.type === 'UNALLOCATED_STOCK'
            ? t('outbound.line.placeholder')
            : (line.batch ?? '—'),
        id: 'batch',
      },
      header: t('outbound.line.batch'),
    },
    {
      c: { key: 'expiryDate' },
      header: t('outbound.line.expiry'),
      ...getDateCell(),
    },
    ...(vvmOn()
      ? [
          {
            c: {
              accessor: (line: Line) => line.vvmStatus?.description ?? '',
              id: 'vvmStatus',
            },
            header: t('outbound.line.vvm'),
          } as Column<Line, never>,
        ]
      : []),
    {
      c: { accessor: line => line.location?.code ?? '', id: 'locationCode' },
      header: t('outbound.line.location'),
    },
    {
      c: { accessor: line => line.item.unitName ?? '', id: 'unitName' },
      header: t('outbound.line.unit'),
    },
    {
      c: { key: 'packSize' },
      header: t('outbound.line.pack-size'),
      ...getNumberCell(),
      aggregationFn: sharedOrMultiple,
    },
    {
      c: { key: 'numberOfPacks' },
      header: t('outbound.line.pack-qty'),
      ...getNumberCell(),
    },
    {
      c: { key: 'receivedNumberOfPacks' },
      header: t('outbound.line.received'),
      ...getNumberCell(),
    },
    {
      c: {
        accessor: line =>
          line.receivedNumberOfPacks != null
            ? line.receivedNumberOfPacks - line.numberOfPacks
            : null,
        id: 'difference',
      },
      header: t('outbound.line.difference'),
      ...getNumberCell(),
    },
    {
      c: {
        accessor: line => line.numberOfPacks * line.packSize,
        id: 'unitQuantity',
      },
      header: t('outbound.line.unit-qty'),
      ...getNumberCell(),
    },
    ...(dosesOn()
      ? [
          {
            c: {
              accessor: (line: Line) =>
                line.item.isVaccine
                  ? line.numberOfPacks * line.packSize * line.item.doses
                  : null,
              id: 'doses',
            },
            header: t('outbound.line.doses'),
            ...getNumberCell(),
          } as Column<Line, never>,
        ]
      : []),
    {
      c: { key: 'sellPricePerPack' },
      header: t('outbound.line.sell-price'),
      ...getCurrencyCell(),
    },
    {
      c: { key: 'totalAfterTax' },
      header: t('outbound.line.total'),
      ...getCurrencyCell(),
    },
    {
      c: { key: 'volumePerPack' },
      header: t('outbound.line.volume'),
      ...getNumberCell(),
    },
  ];

  return (
    <Suspense fallback={<Spinner center />}>
      {/* NON-keyed Show — saves set a fresh node object; keyed would remount
          the page and drop focus (kdd/solid-reactivity-pitfalls). */}
      <Show when={node()}>
        {current => (
          <Tabs defaultValue="details">
            <Page
              fillBody
              sidePanelOpen={sidePanelOpen()}
              sidePanelTitle={t('outbound.detail.side-panel')}
              onSidePanelClose={() => setSidePanelOpen(false)}
              sidePanelContent={
                <OutboundSidePanel
                  node={current()}
                  disabled={!editable()}
                  edit={edit}
                  onSaveField={patch => void saveField(patch)}
                  onEditServiceCharges={() => setServiceOpen(true)}
                />
              }
              header={
                <Header>
                  <Breadcrumb crumbs={crumbs(current())} />
                  <HeaderButtons>
                    <Button
                      icon={<PlusCircleIcon />}
                      data-testid="add-item-button"
                      disabled={!editable()}
                      onClick={openAdd}
                    >
                      {t('outbound.detail.add-item')}
                    </Button>
                    <AddFromMasterListAction
                      storeId={params.storeId}
                      shipmentId={current().id}
                      customerNameId={current().otherParty.id}
                      visible={current().status === 'NEW'}
                      onCommitted={onLineOpsCommitted}
                    />
                    {/* Export/Print — the reports vertical's record-screen
                        selector (reports S4), available at every status. */}
                    <Button
                      icon={<PrinterIcon />}
                      data-testid="export-print-button"
                      onClick={() => setReportsOpen(true)}
                    >
                      {t('button.export-or-print')}
                    </Button>
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
                    {/* Inline label: control pairs on one row (FieldRow, the
                        current app's toolbar layout — the controls hide their
                        own labels, the rows carry them). Customer lookup:
                        disabled when not editable or when the shipment came
                        from a requisition (AC-N2). */}
                    <FieldRow label={t('outbound.toolbar.customer')}>
                      <CustomerSelect
                        label={t('outbound.toolbar.customer')}
                        hideLabel
                        value={current().otherParty.id}
                        disabled={!editable() || current().requisition != null}
                        error={customerError()}
                        onChange={customer => {
                          if (customer) void changeCustomer(customer.id);
                        }}
                      />
                    </FieldRow>
                    <FieldRow label={t('outbound.toolbar.customer-ref')}>
                      <TextField
                        label={t('outbound.toolbar.customer-ref')}
                        hideLabel
                        size="small"
                        data-testid="customer-reference-field"
                        value={edit.state.theirReference}
                        disabled={!editable()}
                        onInput={e =>
                          edit.setField('theirReference', e.currentTarget.value)
                        }
                        onBlur={() => edit.flush()}
                      />
                    </FieldRow>
                  </Toolbar>
                  <TabList
                    tabs={[
                      {
                        value: 'details',
                        label: t('outbound.detail.tab-details'),
                      },
                      { value: 'log', label: t('outbound.detail.tab-log') },
                    ]}
                  />
                </Header>
              }
              contentFooter={
                <Show
                  when={selectedIds().length > 0}
                  fallback={
                    <OutboundStatusFooter
                      storeId={params.storeId}
                      node={current()}
                      hasLines={stockAndPlaceholderLines().length > 0}
                      hasOnlyPlaceholders={hasOnlyPlaceholders()}
                      zeroQuantityItems={zeroQuantityItems()}
                      onSetHold={setHold}
                      onSaved={saved => mutate(() => saved)}
                      onClose={() =>
                        navigate(
                          `/${params.storeId}/distribution/outbound-shipment`
                        )
                      }
                    />
                  }
                >
                  <ContentFooter testId="actions-footer">
                    <strong data-testid="selected-rows-count">
                      {tPlural('outbound.lines.selected', selectedIds().length)}
                    </strong>
                    <DeleteLinesAction
                      storeId={params.storeId}
                      selectedLines={selectedLines}
                      disabled={!editable()}
                      onCommitted={onLineOpsCommitted}
                    />
                    <AllocateLinesAction
                      storeId={params.storeId}
                      selectedLines={selectedLines}
                      disabled={!editable()}
                      onCommitted={onLineOpsCommitted}
                    />
                    {/* Return selected lines: before SHIPPED an explanatory
                        notice (AC-V3); the return flow itself is owned by the
                        returns vertical (not built). */}
                    <Button
                      variant="secondary"
                      onClick={() => setReturnNoticeOpen(true)}
                    >
                      {t('outbound.lines.return')}
                    </Button>
                    <ContentFooterActions>
                      <Button
                        variant="secondary"
                        icon={<MinusCircleIcon />}
                        onClick={() => setSelectedIds([])}
                      >
                        {t('outbound.lines.clear-selection')}
                      </Button>
                    </ContentFooterActions>
                  </ContentFooter>
                </Show>
              }
            >
              <TabPanel value="details">
                <DataTable
                  columns={columns()}
                  rows={stockAndPlaceholderLines()}
                  rowKey={line => line.id}
                  loading={data.loading}
                  onRowClick={editable() ? openRow : undefined}
                  // Placeholder lines read in the info tone — whole-row blue
                  // text, matching the current app (ui-surface S3 line table).
                  rowTone={line =>
                    line.type === 'UNALLOCATED_STOCK' ? 'info' : undefined
                  }
                  emptyMessage={t('outbound.detail.empty')}
                  empty={
                    editable() ? (
                      <Button
                        icon={<PlusCircleIcon />}
                        data-testid="nothing-here-create-button"
                        onClick={openAdd}
                      >
                        {t('outbound.detail.add-item')}
                      </Button>
                    ) : undefined
                  }
                  rowGroup={{
                    columnId: 'itemCode',
                    labelKey: 'outbound.line.name',
                  }}
                  enableSelection
                  selectedIds={selectedIds()}
                  onSelectionChange={setSelectedIds}
                  config={tableConfig.config()}
                  setConfig={tableConfig.setConfig}
                />
              </TabPanel>
              <TabPanel value="log">
                <LogTab storeId={params.storeId} recordId={current().id} />
              </TabPanel>

              <OutboundLineEditModal
                open={editorOpen()}
                onClose={() => setEditorOpen(false)}
                storeId={params.storeId}
                invoiceId={current().id}
                isNew={current().status === 'NEW'}
                initialItem={editorItem()}
                existingItemIds={stockAndPlaceholderLines().map(
                  line => line.item.id
                )}
                onCommitted={onLineOpsCommitted}
              />
              <ServiceChargesModal
                open={serviceOpen()}
                onClose={() => setServiceOpen(false)}
                storeId={params.storeId}
                invoiceId={current().id}
                disabled={!editable()}
                serviceLines={serviceLines()}
                onCommitted={onLineOpsCommitted}
              />
              {/* Export/Print (reports S4): mounted on first open so the
                  selector's chunk loads lazily. */}
              <Show when={reportsOpen()}>
                <ReportSelectorModal
                  context="OUTBOUND_SHIPMENT"
                  dataId={current().id}
                  open
                  onClose={() => setReportsOpen(false)}
                />
              </Show>
              {/* Returns need a shipped shipment (AC-V3) — an info-only
                  notice; the return flow is the returns vertical's. */}
              <Show when={returnNoticeOpen()}>
                <Dialog
                  open
                  onClose={() => setReturnNoticeOpen(false)}
                  icon={<InfoIcon />}
                  title={t('outbound.lines.return')}
                  description={t('outbound.lines.return-blocked')}
                  actions={
                    <Button
                      variant="secondary"
                      icon={<CheckIcon />}
                      onClick={() => setReturnNoticeOpen(false)}
                    >
                      {t('common.ok')}
                    </Button>
                  }
                />
              </Show>
            </Page>
          </Tabs>
        )}
      </Show>
    </Suspense>
  );
};

export default OutboundDetailView;
