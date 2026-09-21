import {
  createMemo,
  createResource,
  createSignal,
  Show,
  Suspense,
  type Component,
} from 'solid-js';
import { useNavigate, useParams, useSearchParams } from '@solidjs/router';
import { t } from '@/intl';
import { graphqlFetch } from '@/api/graphql';
import { gated } from '@/api/gated';
import { createTableConfig } from '@/api/createTableConfig';
import { Page } from '@/ui/layout/Page/Page';
import { Header } from '@/ui/layout/Header/Header';
import { Breadcrumb } from '@/ui/layout/Header/Breadcrumb';
import { HeaderButtons } from '@/ui/layout/Header/HeaderButtons';
import { HeaderToolbar } from '@/ui/layout/Header/HeaderToolbar';
import { ContentFooter } from '@/ui/layout/ContentFooter/ContentFooter';
import { ContentFooterActions } from '@/ui/layout/ContentFooter/ContentFooterActions';
import { Tabs, TabList, TabPanel, type TabDef } from '@/ui/elements/tabs/Tabs';
import { Button } from '@/ui/elements/buttons/Button';
import { Spinner } from '@/ui/elements/feedback/Spinner';
import { ConfirmDialog } from '@/ui/elements/feedback/ConfirmDialog';
import { CloseIcon, SidebarIcon } from '@/ui/icons';
import {
  DataTable,
  type Column,
  type SortState,
} from '@/ui/elements/table/DataTable';
import {
  getCellDefinition,
  getCurrencyCell,
  getDateCell,
  getNumberCell,
} from '@/ui/elements/table/tableHelpers';
import {
  Pagination,
  type PaginationProps,
} from '@/ui/elements/table/Pagination';
import { FilterBar } from '@/ui/elements/selectors/FilterBar';
import { remToPx } from '@/ui/utils/rem';
import { createSidePanelOpen } from '@/ui/layout/SidePanel/createSidePanelOpen';
import { ALT_M } from '@/ui/utils/shortcuts';
import { useUrlQueryState } from '@/list/urlQueryState';
import {
  DEFAULT_PAGE_SIZE,
  initialPageSize,
  rememberPageSize,
} from '@/list/pageSize';
import { clampPageOffset, settledTotal } from '@/list/clampPageOffset';
import { stripEmpty } from '@/typeHelpers';
import { createDebouncedEdit } from '@/domain/debouncedEdit';
import { ActivityLogPanel } from '@/domain/activityLog';
import { ExportPrintButton } from '@/domain/reports';
import { purchaseOrderPreferences } from '@/store/storeContext';
import {
  poLineStatusLabel,
  type PurchaseOrderStatus,
} from '../purchaseOrderStatus';
import {
  PurchaseOrder,
  PurchaseOrderDetailLines,
  PurchaseOrderLineSet,
  type PurchaseOrderInfoFragment,
  type PurchaseOrderDetailLineFragment,
  type PurchaseOrderDetailLinesVariables,
} from './purchaseOrderDetail.generated';
import {
  cascadeDeliveryDate,
  updatePurchaseOrder,
  type DeliveryDateField,
} from './purchaseOrderUpdate';
import type {
  PurchaseOrderEditFields,
  PurchaseOrderPatch,
  SaveFieldResult,
} from './purchaseOrderEdit';
import {
  filterFields,
  type PurchaseOrderLineFilter,
} from './purchaseOrderDetailFilters';
import { PurchaseOrderDetailToolbar } from './PurchaseOrderDetailToolbar';
import { PurchaseOrderSidePanel } from './PurchaseOrderSidePanel';
import { PurchaseOrderStatusFooter } from './PurchaseOrderStatusFooter';
import { PurchaseOrderDetailsTab } from './tabs/PurchaseOrderDetailsTab';
import { PurchaseOrderShipmentsTab } from './tabs/PurchaseOrderShipmentsTab';
import { PurchaseOrderDocumentsTab } from './tabs/PurchaseOrderDocumentsTab';
import {
  canAttachDocuments,
  canAuthorLines,
  canCloseLines,
  isOpenToChange,
} from './purchaseOrderLadder';
import { formatMoney, linePacks, lineCost } from './purchaseOrderPricing';
import { CloseLinesAction, DeleteLinesAction } from './actions';

// An order's own screen (spec/purchase-orders S6, with S7's line table, S8's
// Details tab, S9's side panel, S11-S13's remaining tabs and S18's status
// confirmations).
//
// THREE resources, each answering a different question (kdd/state-management):
//
//  - `info` — the order node: the toolbar, the Details tab, the side panel and
//    the ladder. Spliced in place on a field save.
//  - `lines` — ONE server-paginated, server-sorted, server-searched page of the
//    order's lines for the General tab. The node's own unpaginated `lines` is
//    deliberately unused (see purchaseOrderDetail.graphql).
//  - `lineSet` — the order's whole line set at its thinnest, for the three
//    questions a page cannot answer: the lifecycle gate, the two toolbar dates'
//    cascade, and the finalise warning.
//
// Every one is read NON-SUSPENDING (kdd/solid-reactivity-pitfalls › No remounts
// on interaction): a field save refetches the node while the screen is open,
// and a suspend there would detach an open dialog and drop input focus. The
// initial-load spinner is the <Show> fallback's, not the <Suspense>'s.
//
// NOT built in this pass, and so not reachable from here: the line editor
// (S10), add-from-master-list (S14), the bulk delivery-date modal (S15) and
// the line import (S16). The screen therefore offers no Add action and no row
// click, and the General tab's empty state carries no create affordance —
// which is what the spec says of an order whose lines may not be added by hand
// anyway.

type Line = PurchaseOrderDetailLineFragment;
type SortKey = NonNullable<
  PurchaseOrderDetailLinesVariables['sort']
>[number]['key'];

type DetailUrlState = {
  sort: NonNullable<PurchaseOrderDetailLinesVariables['sort']>;
  filter: PurchaseOrderLineFilter;
  offset: number;
  first: number;
};

// Default sort: Line, ascending (spec S7). The code-or-name search is the
// table's one DEFAULT filter, so its key is seeded present-but-empty (null,
// FilterBar's "added but empty" marker) and stripEmpty drops it from the query.
const DEFAULT_URL_STATE: DetailUrlState = {
  sort: [{ key: 'lineNumber', desc: false }],
  filter: { itemCodeOrName: null },
  offset: 0,
  first: DEFAULT_PAGE_SIZE,
};

// Hidden by default, keyed by column id: the two spec S7 names (pack size and
// SOH), and on a narrow viewport four more that a card cannot carry.
const DEFAULT_HIDDEN: Record<string, boolean> = {
  packSize: false,
  stockOnHand: false,
};
const NARROW_HIDDEN: Record<string, boolean> = {
  ...DEFAULT_HIDDEN,
  unitName: false,
  onOrder: false,
  requestedDeliveryDate: false,
  expectedDeliveryDate: false,
};

const PurchaseOrderDetailView: Component = () => {
  const params = useParams<{ storeId: string; id: string }>();
  const navigate = useNavigate();
  const { query, setQuery } = useUrlQueryState<DetailUrlState>({
    ...DEFAULT_URL_STATE,
    first: initialPageSize(),
  });

  const [selectedIds, setSelectedIds] = createSignal<string[]>([]);
  const [sidePanelOpen, setSidePanelOpen] = createSidePanelOpen();
  // The tab in view rides the address (spec S6 § tabs).
  const [search, setSearch] = useSearchParams<{ tab?: string }>();
  const activeTab = () => search.tab ?? 'general';
  // Lines the last blocked state move named as unorderable — marked in the
  // table so they can be found and removed (spec S18).
  const [blockedLines, setBlockedLines] = createSignal<string[]>([]);

  const prefs = () => purchaseOrderPreferences();

  const tableConfig = createTableConfig({
    tableId: 'purchase-order-detail-lines',
    defaultConfig: {
      compact: {
        viewMode: 'card',
        columnPinning: { left: ['itemCode'] },
        columnVisibility: NARROW_HIDDEN,
      },
      base: {
        columnPinning: { left: ['itemCode'] },
        columnVisibility: DEFAULT_HIDDEN,
      },
    },
  });

  // ── The order node ────────────────────────────────────────────────────────
  const [data, { refetch: refetchInfo }] = createResource(
    () => ({ storeId: params.storeId, id: params.id }),
    async variables => {
      const result = await graphqlFetch(PurchaseOrder, variables);
      return result.kind === 'success' &&
        result.data.purchaseOrder.__typename === 'PurchaseOrderNode'
        ? result.data.purchaseOrder
        : undefined;
    }
  );
  const info = (): PurchaseOrderInfoFragment | undefined => gated(data);

  // ── One page of lines ─────────────────────────────────────────────────────
  const linesVariables = createMemo<PurchaseOrderDetailLinesVariables>(() => ({
    storeId: params.storeId,
    // stripEmpty drops the added-but-empty chip (held as a null key) so the
    // query carries only a live filter. The order scope goes on LAST — it is
    // not the user's to drop.
    filter: {
      ...stripEmpty(query().filter),
      purchaseOrderId: { equalTo: params.id },
    },
    sort: query().sort,
    page: { first: query().first, offset: query().offset },
  }));
  const [linesData, { refetch: refetchLines }] = createResource(
    () => JSON.stringify(linesVariables()),
    async serialised => {
      const result = await graphqlFetch(
        PurchaseOrderDetailLines,
        JSON.parse(serialised) as PurchaseOrderDetailLinesVariables
      );
      if (result.kind !== 'success') return undefined;
      return result.data.purchaseOrderLines.__typename ===
        'PurchaseOrderLineConnector'
        ? result.data.purchaseOrderLines
        : undefined;
    }
  );
  const rows = (): Line[] => gated(linesData)?.nodes ?? [];
  const totalCount = () => gated(linesData)?.totalCount ?? 0;

  // ── The whole line set (gates, cascades, the finalise warning) ────────────
  const [lineSetData, { refetch: refetchLineSet }] = createResource(
    () => ({ storeId: params.storeId, orderId: params.id }),
    async variables => {
      const result = await graphqlFetch(PurchaseOrderLineSet, variables);
      return result.kind === 'success' &&
        result.data.purchaseOrderLines.__typename ===
          'PurchaseOrderLineConnector'
        ? result.data.purchaseOrderLines.nodes
        : [];
    }
  );
  const lineSet = () => gated(lineSetData) ?? [];
  const lineCount = () => lineSet().length;
  // A line carrying no quantity — the order cannot change state at all while
  // one exists (rules § the status lifecycle).
  const emptyLineCount = () =>
    lineSet().filter(line => line.requestedNumberOfUnits === 0).length;
  // Any line still owed stock, on the server's own shortfall expression.
  const stockStillOwed = () =>
    lineSet().some(line => line.outstandingNumberOfUnits > 0);
  // The toolbar's Expected delivery date: the LATEST among the lines. No
  // order-level field carries it (rules § the two delivery dates).
  const latestExpectedDate = () =>
    lineSet()
      .map(line => line.expectedDeliveryDate)
      .filter((date): date is string => !!date)
      .sort()
      .at(-1);

  // A bulk delete of the last page's rows leaves the offset past the new end.
  clampPageOffset({
    total: () => settledTotal(linesData, page => page.totalCount),
    offset: () => query().offset,
    pageSize: () => query().first,
    setOffset: offset => setQuery({ ...query(), offset }),
  });

  const status = () => (info()?.status ?? 'NEW') as PurchaseOrderStatus;
  // Sent or Finalised: every field on the screen is refused — except the
  // comment, which the side panel keeps open in every state (rules § what may
  // be changed, and when). Mirrored here because the refusal names no cause
  // (contract ⚠️), so a control left enabled would fail into a bare toast.
  const isDisabled = () => !isOpenToChange(status());

  const refetchAll = () => {
    void refetchInfo();
    void refetchLines();
    void refetchLineSet();
  };

  // Nothing on this screen is saved by hand — there is no save action anywhere
  // on it (rules § an order's own screen). A save the domain refuses leaves the
  // field showing what was typed until the screen is read again.
  const saveField = async (
    patch: PurchaseOrderPatch
  ): Promise<SaveFieldResult> => {
    const node = info();
    if (!node) return { ok: false };
    const result = await updatePurchaseOrder(params.storeId, {
      id: node.id,
      ...patch,
    });
    if (result.kind === 'saved') {
      // The node carries derived money (both totals, the discount amount), so
      // re-read rather than splicing the patch in.
      void refetchInfo();
      return { ok: true };
    }
    return result.kind === 'error'
      ? { ok: false, message: result.message }
      : { ok: false };
  };

  const edit = createDebouncedEdit<PurchaseOrderEditFields>({
    id: () => info()?.id ?? '',
    initial: () => {
      const node = info();
      return {
        reference: node?.reference ?? '',
        authorisingOfficer1: node?.authorisingOfficer1 ?? '',
        authorisingOfficer2: node?.authorisingOfficer2 ?? '',
        additionalInstructions: node?.additionalInstructions ?? '',
        supplierAgent: node?.supplierAgent ?? '',
        headingMessage: node?.headingMessage ?? '',
        freightConditions: node?.freightConditions ?? '',
        comment: node?.comment ?? '',
      };
    },
    save: patch => void saveField(patch),
  });

  // The requested date is the ORDER's own field as well as every line's; the
  // expected date has no order-level field at all, so it is lines only. One
  // re-read covers both writes.
  const cascadeDate = async (
    field: DeliveryDateField,
    date: string
  ): Promise<SaveFieldResult> => {
    const orderWrite =
      field === 'requestedDeliveryDate'
        ? await updatePurchaseOrder(params.storeId, {
            id: params.id,
            requestedDeliveryDate: { value: date },
          })
        : undefined;
    const outcome = await cascadeDeliveryDate(
      params.storeId,
      lineSet(),
      field,
      date
    );
    refetchAll();
    const message =
      (orderWrite?.kind === 'error' ? orderWrite.message : undefined) ??
      outcome.message;
    return message ? { ok: false, message } : { ok: true };
  };

  const onMove = async (target: PurchaseOrderStatus) => {
    setBlockedLines([]);
    const result = await updatePurchaseOrder(params.storeId, {
      id: params.id,
      status: target,
    });
    if (result.kind === 'saved') {
      // A move cascades onto the lines (their requested dates, their statuses),
      // so the page and the set are both re-read.
      refetchAll();
      return { ok: true };
    }
    if (result.kind === 'error') {
      if (result.blockedLines) setBlockedLines(result.blockedLines);
      return { ok: false, message: result.message };
    }
    return { ok: false };
  };

  const onLinesChanged = () => {
    setSelectedIds([]);
    setBlockedLines([]);
    refetchAll();
  };

  const linePagination = (): PaginationProps => ({
    offset: query().offset,
    pageSize: query().first,
    total: totalCount(),
    onOffsetChange: offset => setQuery({ ...query(), offset }),
    onPageSizeChange: first => {
      rememberPageSize(first);
      setQuery({ ...query(), first, offset: 0 });
    },
  });

  const currentSort = (): SortState<SortKey> | undefined => {
    const sort = query().sort[0];
    return sort ? { key: sort.key, desc: sort.desc ?? false } : undefined;
  };
  const onSort = (key: SortKey, desc: boolean) =>
    setQuery({ ...query(), sort: [{ key, desc }], offset: 0 });

  const tabs = (): TabDef[] => [
    { value: 'general', label: t('label.general') },
    { value: 'shipments', label: t('label.inbound-shipment') },
    { value: 'details', label: t('label.details') },
    { value: 'documents', label: t('label.documents') },
    { value: 'log', label: t('label.log') },
  ];

  // Breadcrumbs: Purchase Orders / <number> — the order's NUMBER, not its
  // identity (spec S6).
  const crumbs = (node: PurchaseOrderInfoFragment) => [
    {
      label: t('purchase-order'),
      to: `/${params.storeId}/replenishment/purchase-order`,
    },
    { label: String(node.number) },
  ];

  const toList = () =>
    navigate(`/${params.storeId}/replenishment/purchase-order`, {
      replace: true,
    });

  const columns = (): Column<Line, SortKey>[] => [
    {
      c: { key: 'lineNumber' },
      sortKey: 'lineNumber',
      // The key reads as "Line", not "Line number" (spec S7 column 1).
      header: () => t('label.line-number'),
      ...getNumberCell(),
      size: remToPx(5),
    },
    {
      // The LINE's own state, not the order's — and never the wire value,
      // which is SCREAMING_CASE (rules § line status).
      c: { accessor: line => poLineStatusLabel(line.status), id: 'status' },
      sortKey: 'status',
      header: () => t('label.status'),
      ...getCellDefinition('unit'),
    },
    {
      c: { accessor: line => line.item.code, id: 'itemCode' },
      sortKey: 'itemCode',
      header: () => t('label.code'),
      ...getCellDefinition('itemCode'),
      // The footer's first cell reads "Total" (spec S7 column 3).
      footer: () => t('label.total'),
    },
    {
      c: { accessor: line => line.item.name, id: 'itemName' },
      sortKey: 'itemName',
      header: () => t('label.item-name'),
      ...getCellDefinition('itemName', {
        headerPosition: 'primary',
        wrapLines: 2,
      }),
      size: remToPx(14),
    },
    {
      // Derived from the quantity and the pack size, on the same rule the
      // order's totals use — a zero pack size contributes nothing
      // (purchaseOrderPricing.ts). No sort key exists for a derived column.
      c: { accessor: line => linePacks(line), id: 'numPacks' },
      header: () => t('label.num-packs'),
      ...getCellDefinition('numberOfPacks'),
    },
    {
      c: { key: 'requestedPackSize' },
      sortKey: 'requestedPackSize',
      header: () => t('label.pack-size'),
      ...getCellDefinition('packSize'),
    },
    {
      c: { accessor: line => line.unit ?? '', id: 'unitName' },
      sortKey: 'unit',
      header: () => t('label.unit-name'),
      ...getCellDefinition('unitName'),
    },
    {
      c: { key: 'requestedNumberOfUnits' },
      sortKey: 'requestedNumberOfUnits',
      header: () => t('label.requested-units'),
      ...getNumberCell(),
      size: remToPx(8),
    },
    {
      // An ABSENT value until set — blank, not 0, which would be a different
      // fact (ui-standards/tables.md § absent values).
      c: { key: 'adjustedNumberOfUnits' },
      sortKey: 'adjustedNumberOfUnits',
      header: () => t('label.adjusted-units'),
      ...getNumberCell(),
      size: remToPx(8),
    },
    {
      // Written by the shipment, never here.
      c: { key: 'shippedNumberOfUnits' },
      sortKey: 'shippedNumberOfUnits',
      header: () => t('label.shipped-units'),
      ...getNumberCell(),
      size: remToPx(8),
    },
    {
      // The ITEM's stock on hand now — not the line's stored figure, which is
      // written as 0.0 at insert and read by nothing.
      c: {
        accessor: line => line.item.stats.stockOnHand,
        id: 'stockOnHand',
      },
      header: () => t('label.soh'),
      ...getNumberCell(),
      size: remToPx(6),
    },
    {
      // The item's units on order across the store's OTHER purchase orders.
      c: { accessor: line => line.unitsOrderedInOthers, id: 'onOrder' },
      header: () => t('label.on-order'),
      ...getNumberCell(),
      size: remToPx(7),
    },
    {
      // Packs × the after-line-discount pack price, at the order currency's
      // precision. Its footer sums the rows ON SCREEN — the page, which is
      // what a paginated table can total; the order's whole subtotal is the
      // side panel's Subtotal row.
      c: { accessor: line => lineCost(line), id: 'lineCost' },
      header: () => t('label.line-cost'),
      ...getCurrencyCell(),
      cell: cell => money(cell.getValue<number>()),
      footer: () =>
        money(rows().reduce((sum, line) => sum + lineCost(line), 0)),
    },
    {
      c: { key: 'requestedDeliveryDate' },
      sortKey: 'requestedDeliveryDate',
      header: () => t('label.requested-delivery-date'),
      ...getDateCell(),
      size: remToPx(11),
    },
    {
      c: { key: 'expectedDeliveryDate' },
      sortKey: 'expectedDeliveryDate',
      header: () => t('label.expected-delivery-date'),
      ...getDateCell(),
      size: remToPx(11),
    },
  ];

  const money = (value: number) => formatMoney(value, info()?.currency?.code);

  return (
    // info()/rows() are read non-suspending, so the initial-load spinner is
    // this <Show>'s fallback; the <Suspense> stays only as the lazy-route
    // boundary. Non-keyed, so a refetch never remounts the screen.
    <Suspense fallback={<Spinner center />}>
      <Show
        when={info()}
        fallback={
          <Show when={!data.loading} fallback={<Spinner center />}>
            {/* No such order (or another store's): the screen is REPLACED by a
                blocking modal whose only way on is back to the list (spec S6 §
                states). */}
            <ConfirmDialog
              open
              title={t('error.purchase-order-not-found')}
              message={t('messages.click-to-return-to-purchase-orders')}
              onConfirm={toList}
              onClose={toList}
            />
          </Show>
        }
      >
        {node => (
          <Tabs value={activeTab()} onValueChange={tab => setSearch({ tab })}>
            <Page
              fillBody
              sidePanelOpen={sidePanelOpen()}
              sidePanelTitle={t('heading.details')}
              onSidePanelClose={() => setSidePanelOpen(false)}
              sidePanelContent={
                <PurchaseOrderSidePanel
                  storeId={params.storeId}
                  node={node()}
                  lineCount={lineCount()}
                  disabled={isDisabled()}
                  edit={edit}
                  onSaveField={saveField}
                  onDeleted={toList}
                />
              }
              header={
                <Header>
                  <Breadcrumb crumbs={crumbs(node())} />
                  <HeaderButtons>
                    <ExportPrintButton
                      context="PURCHASE_ORDER"
                      dataId={node().id}
                      sort={currentSort()}
                    />
                    <Show when={!sidePanelOpen()}>
                      <Button
                        variant="secondary"
                        icon={<SidebarIcon />}
                        collapsible="narrow"
                        title={t('button.more')}
                        data-testid="open-detail-panel-button"
                        shortcut={ALT_M}
                        onClick={() => setSidePanelOpen(true)}
                      >
                        {t('button.more')}
                      </Button>
                    </Show>
                  </HeaderButtons>
                  <HeaderToolbar>
                    <PurchaseOrderDetailToolbar
                      storeId={params.storeId}
                      node={node()}
                      disabled={isDisabled()}
                      edit={edit}
                      latestExpectedDate={latestExpectedDate()}
                      lineCount={lineCount()}
                      onSaveField={saveField}
                      onCascadeDate={cascadeDate}
                    />
                  </HeaderToolbar>
                  <TabList tabs={tabs()} />
                </Header>
              }
              contentFooter={
                <Show
                  when={selectedIds().length > 0}
                  fallback={
                    <PurchaseOrderStatusFooter
                      node={node()}
                      authorisationRequired={prefs().authorisePurchaseOrder}
                      lineCount={lineCount()}
                      emptyLineCount={emptyLineCount()}
                      stockStillOwed={stockStillOwed()}
                      pagination={linePagination()}
                      onMove={onMove}
                    />
                  }
                >
                  {/* Selecting lines swaps the ladder for the bulk-action bar
                      (spec S7 § line-selection actions). Each action carries
                      its own window: removal while drafting, closing for
                      receipt on a Sent order only. The two bulk delivery-date
                      actions belong to S15, which this pass does not build. */}
                  <ContentFooter testId="actions-footer">
                    <strong data-testid="selected-rows-count">
                      {selectedIds().length} {t('label.selected')}
                    </strong>
                    <DeleteLinesAction
                      storeId={params.storeId}
                      selectedIds={selectedIds}
                      disabled={!canAuthorLines(status())}
                      onChanged={onLinesChanged}
                    />
                    <CloseLinesAction
                      storeId={params.storeId}
                      selectedIds={selectedIds}
                      disabled={!canCloseLines(status())}
                      onChanged={onLinesChanged}
                    />
                    {/* The pager rides the selection face too: ticking a row
                        must not strip the way to the rest of the lines. */}
                    <Pagination {...linePagination()} inBar />
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
              <TabPanel value="general">
                <DataTable
                  columns={columns()}
                  rows={rows()}
                  rowKey={line => line.id}
                  // The code-or-name filter lives in the table's own toolbar
                  // (ui-standards › tables › toolbar), never the page header.
                  filters={
                    <FilterBar
                      filters={filterFields()}
                      filter={query().filter}
                      onChange={filter =>
                        setQuery({ ...query(), filter, offset: 0 })
                      }
                    />
                  }
                  loading={linesData.loading}
                  sort={currentSort()}
                  onSort={onSort}
                  // A CLOSED line is marked as RESTRICTED — the same disabled
                  // row treatment the orders list gives an order closed to
                  // change, since closure is a standing property of the line
                  // (spec S7).
                  rowState={line =>
                    line.status === 'CLOSED' ? 'disabled' : undefined
                  }
                  // A line named by a blocked state move reads in the error
                  // tone so it can be found and removed (spec S18); a line
                  // with no quantity reads as a placeholder — not yet ordered
                  // (spec S7). Error wins when both hold.
                  rowTone={line =>
                    blockedLines().includes(line.id)
                      ? 'error'
                      : line.requestedNumberOfUnits === 0
                        ? 'info'
                        : undefined
                  }
                  emptyMessage={t('error.no-purchase-order-items')}
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
                />
              </TabPanel>
              <TabPanel value="shipments">
                <PurchaseOrderShipmentsTab
                  storeId={params.storeId}
                  orderId={node().id}
                />
              </TabPanel>
              <TabPanel value="details">
                <PurchaseOrderDetailsTab
                  node={node()}
                  disabled={isDisabled()}
                  edit={edit}
                  onSaveField={saveField}
                />
              </TabPanel>
              <TabPanel value="documents">
                <PurchaseOrderDocumentsTab
                  node={node()}
                  canChange={canAttachDocuments(status())}
                  onChanged={() => void refetchInfo()}
                />
              </TabPanel>
              <TabPanel value="log">
                <ActivityLogPanel
                  storeId={params.storeId}
                  recordId={node().id}
                />
              </TabPanel>
            </Page>
          </Tabs>
        )}
      </Show>
    </Suspense>
  );
};

export default PurchaseOrderDetailView;
