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
import { DataTable, type Column } from '../../../ui/elements/table/DataTable';
import {
  formatCurrencyCell,
  getCurrencyCell,
  getExpiryDateCell,
  getNumberCell,
} from '../../../ui/elements/table/tableHelpers';
import { formatNumber } from '../../../intl/formatNumber';
import { createTableConfig } from '../../../api/createTableConfig';
import { createMediaQuery } from '../../../ui/utils/createMediaQuery';
import { Dialog } from '../../../ui/elements/feedback/Dialog';
import {
  CheckIcon,
  InfoIcon,
  MinusCircleIcon,
  PlusCircleIcon,
} from '../../../ui/icons';
import { NameSearch } from '../../../domain/name';
import { createDebouncedEdit } from '../../../domain/debouncedEdit';
import {
  CustomFieldsEditTab,
  CustomFieldsToolbar,
} from '../../../domain/customFields';
import {
  OutboundDetail,
  UpdateOutboundShipmentName,
  type OutboundLineFragment,
} from './outboundDetail.generated';
import { saveShipmentFields, type OutboundNode } from './outboundUpdate';
import type { OutboundEditFields } from './outboundEdit';
import { isEditable, canReturnLines } from '../outboundStatus';
import { outboundPrefs } from '../outboundPreferencesResource';
import { OutboundStatusFooter } from './OutboundStatusFooter';
import { OutboundSidePanel } from './OutboundSidePanel';
import { LogTab } from './LogTab';
import {
  OutboundLineEditModal,
  type LineEditItem,
} from './edit-modal/OutboundLineEditModal';
import { ServiceChargesModal } from './service-charges/ServiceChargesModal';
// The from-shipment customer-return flow (spec/customer-returns S4, owned by
// the returns vertical — AC-V3 hands over to it). Lazy so the returns graph it
// pulls in stays out of this section's eager chunk, loading only when a return
// is actually started.
const ReturnFromShipmentModal = lazy(() =>
  import('../../customer-returns/detail/edit-modal/ReturnFromShipmentModal').then(
    module => ({ default: module.ReturnFromShipmentModal })
  )
);
import {
  AddFromMasterListAction,
  AllocateLinesAction,
  DeleteLinesAction,
  ExportPrintAction,
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
  // "Return selected lines": at SHIPPED+ opens the customer-return create flow
  // (returnModalOpen, AC-V3); before that the explanatory notice instead.
  const [returnNoticeOpen, setReturnNoticeOpen] = createSignal(false);
  const [returnModalOpen, setReturnModalOpen] = createSignal(false);

  const [data, { mutate, refetch }] = createResource(
    () => ({ storeId: params.storeId, id: params.invoiceId }),
    async variables => {
      // A not-found NodeError is NOT routed to the global error modal (which
      // would offer a useless reload of the same bad id, and shadow the local
      // notice); it falls through to `undefined` here and the view shows the
      // AC-L5 "not found" blocking notice → back to list.
      const result = await graphqlFetch(OutboundDetail, variables);
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
  // Default line-table order: item name ascending (ui-surface S3 § line table;
  // matches the old app). A flat client-side sort — all lines are loaded, and
  // the table is un-grouped (D34).
  const sortedLines = () =>
    [...stockAndPlaceholderLines()].sort((a, b) =>
      a.itemName.localeCompare(b.itemName)
    );
  // The shipment's items in line-table order (distinct) — the line editor
  // excludes them from the add-mode picker and, in edit mode, pages through
  // them with OK & next.
  const orderedItems = (): LineEditItem[] => {
    const seen = new Set<string>();
    const items: LineEditItem[] = [];
    for (const line of sortedLines()) {
      if (seen.has(line.item.id)) continue;
      seen.add(line.item.id);
      items.push({
        id: line.item.id,
        name: line.item.name,
        unitName: line.item.unitName,
        isVaccine: line.item.isVaccine,
        doses: line.item.doses,
      });
    }
    return items;
  };

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
          volume: false,
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

  // Custom-fields save (explicit-save tab) — patch-merged server-side; returns
  // true so the tab clears its dirty state. The toolbar (prominent fields) uses
  // saveField directly (fire-and-forget, like the other toolbar fields).
  const saveCustomFields = async (
    patch: Record<string, unknown>
  ): Promise<boolean> => {
    const current = node();
    if (!current) return false;
    const saved = await saveShipmentFields(params.storeId, {
      id: current.id,
      customFields: patch,
    });
    if (saved) {
      mutate(() => saved);
      return true;
    }
    return false;
  };

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
  // Bulk-action visibility (spec S3 § bulk line actions matrix): state-disallowed
  // actions are HIDDEN, not disabled.
  const hasSelectedPlaceholder = () =>
    selectedLines().some(line => line.type === 'UNALLOCATED_STOCK');

  const prefs = () => outboundPrefs()?.prefs;
  const dosesOn = () => prefs()?.manageVaccinesInDoses ?? false;
  const vvmOn = () => prefs()?.manageVvmStatusForStock ?? false;

  const crumbs = (current: OutboundNode) => [
    { label: t('distribution') },
    {
      label: t('outbound-shipments'),
      onClick: () =>
        navigate(`/${params.storeId}/distribution/outbound-shipment`),
    },
    { label: String(current.invoiceNumber) },
  ];

  // The detail line table (spec S3 § line table): one row per stock/placeholder
  // line — flat, since main dropped row-grouping from the shared DataTable;
  // placeholder rows show the requested quantity.
  const columns = (): Column<Line, never>[] => {
    // Footer totals (spec § line table: "Totals for quantity/total/volume in
    // the table footer", D45 — richer than the old app's Total-label + volume
    // sum, standing in for the per-item aggregates dropped with grouping,
    // D34). Computed here so columns() takes the reactive dependency and the
    // footer closures stay plain (the Financial tab's pattern).
    const totals = stockAndPlaceholderLines().reduce(
      (sum, line) => ({
        packs: sum.packs + line.numberOfPacks,
        units: sum.units + line.numberOfPacks * line.packSize,
        price: sum.price + line.totalAfterTax,
        volume: sum.volume + line.volumePerPack * line.numberOfPacks,
      }),
      { packs: 0, units: 0, price: 0, volume: 0 }
    );
    return [
      {
        c: { key: 'itemCode' },
        header: t('label.code'),
        footer: () => t('label.total'),
      },
      {
        c: { key: 'itemName' },
        header: t('label.name'),
        meta: { cardPosition: 'header-primary', wrapLines: 2 },
      },
      {
        c: {
          accessor: line =>
            line.type === 'UNALLOCATED_STOCK'
              ? t('label.placeholder')
              : (line.batch ?? '—'),
          id: 'batch',
        },
        header: t('label.batch'),
      },
      {
        c: { key: 'expiryDate' },
        header: t('label.expiry-date'),
        ...getExpiryDateCell(),
      },
      ...(vvmOn()
        ? [
            {
              c: {
                accessor: (line: Line) => line.vvmStatus?.description ?? '',
                id: 'vvmStatus',
              },
              header: t('label.vvm-status'),
            } as Column<Line, never>,
          ]
        : []),
      {
        c: { accessor: line => line.location?.code ?? '', id: 'locationCode' },
        header: t('label.location'),
      },
      {
        c: { accessor: line => line.item.unitName ?? '', id: 'unitName' },
        header: t('label.unit'),
      },
      {
        c: { key: 'packSize' },
        header: t('label.pack-size'),
        ...getNumberCell(),
      },
      ...(dosesOn()
        ? [
            {
              c: {
                accessor: (line: Line) =>
                  line.item.isVaccine ? line.item.doses : null,
                id: 'dosesPerUnit',
              },
              header: t('label.doses-per-unit'),
              ...getNumberCell(),
            } as Column<Line, never>,
          ]
        : []),
      {
        c: { key: 'numberOfPacks' },
        header: t('label.pack-quantity'),
        footer: () => formatNumber(totals.packs),
        ...getNumberCell(),
      },
      {
        c: { key: 'receivedNumberOfPacks' },
        header: t('label.packs-received'),
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
        header: t('label.difference'),
        ...getNumberCell(),
      },
      {
        c: {
          accessor: line => line.numberOfPacks * line.packSize,
          id: 'unitQuantity',
        },
        header: t('label.unit-quantity'),
        footer: () => formatNumber(totals.units),
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
              header: t('label.doses'),
              ...getNumberCell(),
            } as Column<Line, never>,
          ]
        : []),
      {
        c: { key: 'sellPricePerPack' },
        header: t('label.unit-sell-price'),
        ...getCurrencyCell(),
      },
      {
        c: { key: 'totalAfterTax' },
        header: t('label.total'),
        footer: () => formatCurrencyCell(totals.price),
        ...getCurrencyCell(),
      },
      {
        // Line volume — volume per pack × packs (the old app's volume column),
        // not the raw per-pack figure; the footer then sums to the shipment
        // volume, matching the old app's footer.
        c: {
          accessor: line => line.volumePerPack * line.numberOfPacks,
          id: 'volume',
        },
        header: t('label.volume'),
        footer: () => formatNumber(totals.volume, { maximumFractionDigits: 5 }),
        ...getNumberCell(),
      },
    ];
  };

  return (
    <Suspense fallback={<Spinner center />}>
      {/* NON-keyed Show — saves set a fresh node object; keyed would remount
          the page and drop focus (kdd/solid-reactivity-pitfalls). */}
      <Show
        when={node()}
        fallback={
          <Show when={!data.loading}>
            <Dialog
              open
              dismissable={false}
              onClose={() =>
                navigate(`/${params.storeId}/distribution/outbound-shipment`)
              }
              icon={<InfoIcon />}
              title={t('heading.not-found')}
              description={t('error.shipment-not-found')}
              actions={
                <Button
                  variant="secondary"
                  icon={<CheckIcon />}
                  data-testid="dialog-button-ok"
                  onClick={() =>
                    navigate(
                      `/${params.storeId}/distribution/outbound-shipment`
                    )
                  }
                >
                  {t('button.ok')}
                </Button>
              }
            />
          </Show>
        }
      >
        {current => (
          <Tabs defaultValue="details">
            <Page
              fillBody
              sidePanelOpen={sidePanelOpen()}
              sidePanelTitle={t('label.details')}
              onSidePanelClose={() => setSidePanelOpen(false)}
              sidePanelContent={
                <OutboundSidePanel
                  node={current()}
                  storeId={params.storeId}
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
                    <Show when={editable()}>
                      <Button
                        icon={<PlusCircleIcon />}
                        data-testid="add-item-button"
                        onClick={openAdd}
                      >
                        {t('button.add-item')}
                      </Button>
                    </Show>
                    <AddFromMasterListAction
                      storeId={params.storeId}
                      shipmentId={current().id}
                      customerNameId={current().otherParty.id}
                      visible={current().status === 'NEW'}
                      onCommitted={onLineOpsCommitted}
                    />
                    {/* Export/Print — the reports vertical's record-screen
                        selector (reports S4), available at every status. A
                        self-contained action (static import), mirroring the
                        sibling verticals — see ExportPrintAction. */}
                    <ExportPrintAction shipmentId={current().id} />
                    <Show when={!sidePanelOpen()}>
                      <Button
                        variant="secondary"
                        icon={<InfoIcon />}
                        data-testid="open-detail-panel-button"
                        onClick={() => setSidePanelOpen(true)}
                      >
                        {t('button.more')}
                      </Button>
                    </Show>
                  </HeaderButtons>
                  <Toolbar>
                    {/* Inline label: control pairs on one row (FieldRow, the
                        current app's toolbar layout — the controls hide their
                        own labels, the rows carry them). Customer lookup:
                        disabled when not editable or when the shipment came
                        from a requisition (AC-N2). */}
                    <FieldRow label={t('label.customer-name')}>
                      <NameSearch
                        label={t('label.customer-name')}
                        hideLabel
                        storeId={params.storeId}
                        role="customer"
                        // Seed the record's current customer so the selection's
                        // label resolves before (or regardless of) its page.
                        selected={{
                          id: current().otherParty.id,
                          name: current().otherParty.name,
                          code: current().otherParty.code,
                          isOnHold: current().otherParty.isOnHold,
                          isStore: current().otherParty.store != null,
                          isSupplier: false,
                          isDonor: false,
                        }}
                        disabled={!editable() || current().requisition != null}
                        error={customerError()}
                        clearable={false}
                        onSelect={customer => {
                          if (customer) void changeCustomer(customer.id);
                        }}
                      />
                    </FieldRow>
                    <FieldRow label={t('label.customer-ref')}>
                      <TextField
                        label={t('label.customer-ref')}
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
                    {/* PROMINENT custom fields — stay in the toolbar even when
                        the shipment is read-only (past PICKED), just disabled. */}
                    <CustomFieldsToolbar
                      scope="outbound_shipment"
                      recordId={current().id}
                      values={current().customFields}
                      disabled={!editable()}
                      onSave={patch => void saveField({ customFields: patch })}
                    />
                  </Toolbar>
                  <TabList
                    tabs={[
                      {
                        value: 'details',
                        label: t('label.details'),
                      },
                      {
                        value: 'custom-fields',
                        label: t('label.custom-fields'),
                      },
                      { value: 'log', label: t('label.log') },
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
                      {tPlural('label.items-selected', selectedIds().length)}
                    </strong>
                    {/* Delete: hidden (not disabled) when read-only — editable
                        only (NEW/ALLOCATED/PICKED). S3 bulk-action matrix. */}
                    <Show when={editable()}>
                      <DeleteLinesAction
                        storeId={params.storeId}
                        selectedLines={selectedLines}
                        disabled={false}
                        onCommitted={onLineOpsCommitted}
                      />
                    </Show>
                    {/* Allocate placeholder lines: only while editable AND a
                        placeholder line is in the selection. */}
                    <Show when={editable() && hasSelectedPlaceholder()}>
                      <AllocateLinesAction
                        storeId={params.storeId}
                        selectedLines={selectedLines}
                        disabled={false}
                        onCommitted={onLineOpsCommitted}
                      />
                    </Show>
                    {/* Return selected lines (AC-V3): shown at EVERY status (not
                        hidden, not disabled). At SHIPPED / DELIVERED / VERIFIED
                        it opens the customer-return create flow (owned by the
                        returns vertical, over this shipment); any other status
                        (RECEIVED included) gets the explanatory notice. See the
                        S3 bulk-action matrix. */}
                    <Button
                      variant="secondary"
                      data-testid="return-lines-button"
                      onClick={() =>
                        canReturnLines(current().status)
                          ? setReturnModalOpen(true)
                          : setReturnNoticeOpen(true)
                      }
                    >
                      {t('button.return-lines')}
                    </Button>
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
              <TabPanel value="details">
                <DataTable
                  columns={columns()}
                  rows={sortedLines()}
                  rowKey={line => line.id}
                  loading={data.loading}
                  onRowClick={editable() ? openRow : undefined}
                  // Placeholder lines read in the info tone — whole-row blue
                  // text, matching the current app (ui-surface S3 line table).
                  rowTone={line =>
                    line.type === 'UNALLOCATED_STOCK' ? 'info' : undefined
                  }
                  emptyMessage={t('error.no-outbound-items')}
                  empty={
                    editable() ? (
                      <Button
                        icon={<PlusCircleIcon />}
                        data-testid="nothing-here-create-button"
                        onClick={openAdd}
                      >
                        {t('button.add-item')}
                      </Button>
                    ) : undefined
                  }
                  enableSelection
                  selectedIds={selectedIds()}
                  onSelectionChange={setSelectedIds}
                  config={tableConfig.config()}
                  setConfig={tableConfig.setConfig}
                />
              </TabPanel>
              <TabPanel value="custom-fields">
                {/* Custom fields for the outbound_shipment scope — disabled once
                    the shipment is read-only (past PICKED). Prominent fields
                    live in the toolbar, so the tab shows the rest. */}
                <CustomFieldsEditTab
                  scope="outbound_shipment"
                  promoteToToolbar
                  disabled={!editable()}
                  values={current().customFields}
                  onSave={saveCustomFields}
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
                customerIsStore={current().otherParty.store != null}
                initialItem={editorItem()}
                existingItems={orderedItems()}
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
              {/* Returns need a shipped shipment (AC-V3) — an info-only
                  notice; the return flow is the returns vertical's. */}
              <Show when={returnNoticeOpen()}>
                <Dialog
                  open
                  onClose={() => setReturnNoticeOpen(false)}
                  icon={<InfoIcon />}
                  title={t('button.return-lines')}
                  description={t('messages.cant-return-shipment')}
                  actions={
                    <Button
                      variant="secondary"
                      icon={<CheckIcon />}
                      onClick={() => setReturnNoticeOpen(false)}
                    >
                      {t('button.ok')}
                    </Button>
                  }
                />
              </Show>
              {/* From-shipment customer-return flow (AC-V3 → customer-returns
                  S4): seeded from the selected STOCK lines (placeholder and
                  service lines can't be returned, so they're excluded); the
                  return is created born VERIFIED and linked to this shipment,
                  then we navigate to it. Own Suspense boundary, as for the
                  report selector above. */}
              <Show when={returnModalOpen()}>
                <Suspense>
                  <ReturnFromShipmentModal
                    open
                    onClose={() => setReturnModalOpen(false)}
                    storeId={params.storeId}
                    outboundShipmentId={current().id}
                    outboundShipmentInvoiceNumber={current().invoiceNumber}
                    customerId={current().otherParty.id}
                    customerName={current().otherParty.name}
                    outboundShipmentLineIds={() =>
                      selectedLines()
                        .filter(
                          line =>
                            line.type !== 'SERVICE' &&
                            line.type !== 'UNALLOCATED_STOCK'
                        )
                        .map(line => line.id)
                    }
                    onCreated={returnId => {
                      setReturnModalOpen(false);
                      setSelectedIds([]);
                      navigate(
                        `/${params.storeId}/distribution/customer-return/${returnId}`
                      );
                    }}
                  />
                </Suspense>
              </Show>
            </Page>
          </Tabs>
        )}
      </Show>
    </Suspense>
  );
};

export default OutboundDetailView;
