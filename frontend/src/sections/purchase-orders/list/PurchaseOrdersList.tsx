import { createMemo, createResource, createSignal } from 'solid-js';
import type { Component } from 'solid-js';
import { useNavigate, useParams } from '@solidjs/router';
import { graphqlFetch } from '@/api/graphql';
import { t } from '@/intl';
import { Page } from '@/ui/layout/Page/Page';
import { Header } from '@/ui/layout/Header/Header';
import { Breadcrumb } from '@/ui/layout/Header/Breadcrumb';
import { HeaderButtons } from '@/ui/layout/Header/HeaderButtons';
import { Button } from '@/ui/elements/buttons/Button';
import { createAddAction } from '@/ui/utils/keyActions';
import { ALT_N } from '@/ui/utils/shortcuts';
import {
  DataTable,
  type Column,
  type SortState,
} from '@/ui/elements/table/DataTable';
import {
  CommentHeader,
  getCellDefinition,
  getCurrencyCell,
  getDateCell,
  getNumberCell,
  getTextCell,
} from '@/ui/elements/table/tableHelpers';
import { remToPx } from '@/ui/utils/rem';
import { createTableConfig } from '@/api/createTableConfig';
import { StatusChip } from '@/ui/elements/feedback/StatusChip';
import { FilterBar } from '@/ui/elements/selectors/FilterBar';
import { MenuLinesIcon, PlusCircleIcon } from '@/ui/icons';
import { useUrlQueryState } from '@/list/urlQueryState';
import {
  DEFAULT_PAGE_SIZE,
  initialPageSize,
  rememberPageSize,
} from '@/list/pageSize';
import { clampPageOffset, settledTotal } from '@/list/clampPageOffset';
import { stripEmpty } from '@/typeHelpers';
import {
  isRowRestricted,
  poStatusColour,
  poStatusLabel,
} from '../purchaseOrderStatus';
import { PurchaseOrders } from './purchaseOrders.generated';
import type {
  PurchaseOrderRowFragment,
  PurchaseOrdersVariables,
} from './purchaseOrders.generated';
import { filterFields, type PurchaseOrderFilter } from './listFilters';
import type { PurchaseOrderSelection } from './deletePurchaseOrders';
import { CreatePurchaseOrderModal } from './CreatePurchaseOrderModal';
import {
  DeletePurchaseOrdersAction,
  ExportPurchaseOrdersAction,
} from './actions';

// The purchase-orders list view (spec/purchase-orders S1) — the store's own
// orders to its external suppliers. Composed exactly like the reference
// vertical (stocktakes): URL-backed filter/sort/pagination, the shared
// DataTable, a selection footer with bulk delete, and no page CSS.
//
// The whole DESTINATION is gated on the store's procurement functionality
// (rules § availability). That gate is the navigation registry's, applied by
// the shell to the menu, the palette AND the route alike (navConfig
// `gate: 'procurement'`), so this screen carries no gate of its own — and,
// unlike the reference app, opening the address directly does not render it
// (README defect 7).

type Row = PurchaseOrderRowFragment;

// Sortable columns are typed to the generated sort-field union, so a column can
// only ever name a real sort key (kdd/type-safety). The server offers FOUR —
// number, created, status, target months — and no more, so the eight other
// columns cannot be sortable in a front end that sorts server-side: the
// reference list marks some of them sortable anyway and re-sorts the fetched
// page in the browser, which orders the page rather than the list
// (contract § listing orders, backend gaps).
type SortKey = NonNullable<PurchaseOrdersVariables['sort']>[number]['key'];

type ListState = {
  filter: PurchaseOrderFilter;
  sort?: PurchaseOrdersVariables['sort'];
  offset: number;
  first: number;
};

// Default sort: newest created first (rules § listing orders), declared in ONE
// place — the reference app declares it twice, in its URL hook and its table,
// and the two disagree (contract ⚠️ two different default sorts). Supplier is
// the list's one default filter, so its key is seeded present-but-empty (null,
// FilterBar's "added but empty" marker) and stripEmpty drops it from the query.
const DEFAULT_STATE: ListState = {
  filter: { supplier: null },
  sort: [{ key: 'createdDatetime', desc: true }],
  offset: 0,
  first: DEFAULT_PAGE_SIZE,
};

const PurchaseOrdersList: Component = () => {
  // storeId is guaranteed present: this section renders only inside
  // StoreGuardLayout, which requires a resolved store before routing.
  const params = useParams<{ storeId: string }>();
  const navigate = useNavigate();
  const { query, setQuery } = useUrlQueryState<ListState>({
    ...DEFAULT_STATE,
    first: initialPageSize(),
  });
  const [createOpen, setCreateOpen] = createSignal(false);

  // Alt+N — this screen's add action (spec/keyboard KB-R2, AC-KB7). Declared by
  // the SCREEN, once, because two controls trigger it: the header button and
  // the ghost button in the table's empty slot. Each carries `shortcut={ALT_N}`
  // for its badge; neither owns the action.
  createAddAction({
    name: 'button.new-purchase-order',
    run: () => setCreateOpen(true),
  });

  // Column config (order/sizing/pinning/visibility) by breakpoint band
  // (kdd/table-state). On COMPACT the default drops to CARD view and hides the
  // four figures the reference app also hides on mobile — target months, total
  // cost, currency and the line count — leaving the supplier, number, status
  // and the dates. Supplier stays SHOWN here even though the reference hides
  // it too: it is the card's identity line, and a card titled by nothing is
  // worse than a narrow one.
  const tableConfig = createTableConfig({
    tableId: 'purchase-orders',
    defaultConfig: {
      compact: {
        viewMode: 'card',
        columnVisibility: {
          targetMonths: false,
          orderTotalAfterDiscount: false,
          currency: false,
          lines: false,
        },
      },
    },
  });

  const variables = createMemo<PurchaseOrdersVariables>(() => ({
    storeId: params.storeId,
    // stripEmpty drops added-but-empty filter chips (held as null keys) and any
    // empty operator objects, so the query — and the serialised resource key
    // below — carry only live filters: adding an empty chip does not reflash
    // the list.
    filter: stripEmpty(query().filter),
    sort: query().sort,
    page: { first: query().first, offset: query().offset },
  }));

  // The resource SOURCE is the SERIALISED variables (a stable string), not the
  // variables object (kdd/solid-reactivity-pitfalls): two states with identical
  // query content produce an equal string, so the resource does not refetch.
  const [data, { refetch }] = createResource(
    () => JSON.stringify(variables()),
    async serialised => {
      const result = await graphqlFetch(
        PurchaseOrders,
        JSON.parse(serialised) as PurchaseOrdersVariables
      );
      if (result.kind !== 'success') return undefined;
      return result.data.purchaseOrders;
    }
  );

  // Read `data.latest`, NOT `data()`: `.latest` never suspends, so the table
  // mounts immediately and shows its own loading treatment instead of the page
  // going blank on a slow first load (#160/#196).
  const rows = (): Row[] => data.latest?.nodes ?? [];
  // The whole filtered set, not the page (rules § listing orders).
  const totalCount = () => data.latest?.totalCount ?? 0;

  // The selection carries each order's NUMBER alongside its id, because the
  // delete report names the orders it refused. A selection survives a page
  // change, outliving the row that carried the number, so the number is read
  // off the row as the id is selected — it was on the page at that moment —
  // and travels with the id until it leaves the selection. ONE signal, not an
  // id list beside a number map: there is then no invariant to keep, and no id
  // that could reach the wire without its label.
  const [selection, setSelection] = createSignal<PurchaseOrderSelection[]>([]);
  const selectedIds = createMemo(() => selection().map(s => s.id));
  const onSelectionChange = (ids: string[]) => {
    const known = new Map(selection().map(s => [s.id, s.number]));
    setSelection(
      ids.map(id => ({
        id,
        number: known.get(id) ?? rows().find(r => r.id === id)?.number,
      }))
    );
  };
  const clearSelection = () => setSelection([]);

  // A bulk delete of the last page's rows leaves the offset past the new end
  // (src/list/clampPageOffset.ts, issue #1117).
  clampPageOffset({
    total: () => settledTotal(data, page => page.totalCount),
    offset: () => query().offset,
    pageSize: () => query().first,
    setOffset: offset => setQuery({ ...query(), offset }),
  });

  const currentSort = (): SortState<SortKey> | undefined => {
    const s = query().sort?.[0];
    return s ? { key: s.key, desc: s.desc ?? false } : undefined;
  };
  const onSort = (key: SortKey, desc: boolean) =>
    setQuery({ ...query(), sort: [{ key, desc }], offset: 0 });
  const onFilterChange = (filter: PurchaseOrderFilter) => {
    setQuery({ ...query(), filter, offset: 0 });
    clearSelection();
  };

  const openRow = (row: Row) =>
    navigate(`/${params.storeId}/replenishment/purchase-order/${row.id}`);

  // Columns and crumbs are accessors (not plain arrays): their text comes from
  // t(), which must be read in a reactive scope to re-translate on a language
  // switch.
  const columns = (): Column<Row, SortKey>[] => [
    {
      // Supplier — the order's supplier name; absent when the row resolves no
      // supplier. No server sort key exists for it.
      c: { accessor: row => row.supplier?.name ?? '', id: 'supplier' },
      header: () => t('label.supplier'),
      ...getCellDefinition('supplierName', {
        headerPosition: 'primary',
        wrapLines: 2,
      }),
    },
    {
      c: { key: 'number' },
      sortKey: 'number',
      header: () => t('label.number'),
      ...getCellDefinition('purchaseOrderNumber'),
    },
    {
      c: { key: 'createdDatetime' },
      sortKey: 'createdDatetime',
      header: () => t('label.created'),
      ...getCellDefinition('createdDatetime'),
    },
    {
      // Confirmed — the moment Ready for sending was reached (the state's own
      // label is "Ready for sending"; only this TIMESTAMP reads "Confirmed" —
      // ui-surface § status labels). Empty until then, as an absent value.
      c: { key: 'confirmedDatetime' },
      header: () => t('label.confirmed'),
      ...getCellDefinition('confirmedDatetime'),
    },
    {
      c: { key: 'sentDatetime' },
      header: () => t('label.sent'),
      ...getDateCell(),
      size: remToPx(7),
    },
    {
      c: { key: 'requestedDeliveryDate' },
      header: () => t('label.requested-delivery-date'),
      // No CELL_DEF key: the binding constraint is the long header, not the
      // date, so it is sized here (one-off to this table).
      ...getDateCell(),
      size: remToPx(11),
    },
    {
      c: { key: 'status' },
      sortKey: 'status',
      header: () => t('label.status'),
      cell: info => {
        const status = info.getValue<Row['status']>();
        return (
          <StatusChip
            label={poStatusLabel(status)}
            colour={poStatusColour(status)}
          />
        );
      },
      // Status has no cell-type preset (it is page-rendered), so the width
      // lives here — wide enough for "Ready for approval".
      meta: { headerPosition: 'badge' },
      size: remToPx(10),
      maxSize: remToPx(12),
    },
    {
      // Target months — synchronised data only; nothing in the app writes it
      // (contract ⚠️). Sortable because the server offers the key.
      c: { key: 'targetMonths' },
      sortKey: 'targetMonths',
      header: () => t('label.target-months'),
      ...getNumberCell(),
      size: remToPx(8),
    },
    {
      // Total cost — the DISCOUNTED total, which EXCLUDES the order's
      // additional charges, so it is not the final cost an order's own screen
      // presents; the two figures legitimately differ (rules § listing
      // orders).
      c: { key: 'orderTotalAfterDiscount' },
      header: () => t('label.total-cost'),
      ...getCurrencyCell(),
      size: remToPx(8),
    },
    {
      // Currency — the order's own currency code, inherited from its supplier.
      c: { accessor: row => row.currency?.code ?? '', id: 'currency' },
      header: () => t('label.currency'),
      ...getTextCell(),
      size: remToPx(6),
    },
    {
      // Lines — how many lines the order has. The list never reads the lines
      // themselves.
      c: { accessor: row => row.lines.totalCount, id: 'lines' },
      header: () => t('label.lines'),
      ...getNumberCell(),
      size: remToPx(5),
    },
    {
      c: { key: 'comment' },
      header: () => <CommentHeader />,
      ...getCellDefinition('comment'),
    },
  ];

  const crumbs = () => [{ label: t('purchase-order') }];

  return (
    <Page
      fillBody
      header={
        <Header>
          <Breadcrumb crumbs={crumbs()} />
          <HeaderButtons>
            <Button
              icon={<PlusCircleIcon />}
              shortcut={ALT_N}
              data-testid="new-purchase-order-button"
              onClick={() => setCreateOpen(true)}
            >
              {t('button.new-purchase-order')}
            </Button>
            {/* The outstanding-lines list (S5) is the vertical's second
                screen — a separate slice; this is the way in the spec gives
                it. */}
            <Button
              variant="secondary"
              icon={<MenuLinesIcon />}
              data-testid="outstanding-lines-button"
              onClick={() =>
                navigate(
                  `/${params.storeId}/replenishment/purchase-order/outstanding`
                )
              }
            >
              {t('button.outstanding-lines')}
            </Button>
            {/* Export the orders list (every page of the current filter, in
                the current order) as CSV or Excel. */}
            <ExportPurchaseOrdersAction
              storeId={params.storeId}
              filter={() => query().filter}
              sort={() => query().sort}
            />
          </HeaderButtons>
        </Header>
      }
    >
      <DataTable
        columns={columns()}
        rows={rows()}
        rowKey={r => r.id}
        // Filters live in the table's own toolbar (ui-standards § tables →
        // filtering), never the page header; state stays URL-backed here.
        filters={
          <FilterBar
            filters={filterFields()}
            filter={query().filter}
            onChange={onFilterChange}
          />
        }
        loading={data.loading}
        sort={currentSort()}
        onSort={onSort}
        onRowClick={openRow}
        // A Sent or Finalised order is closed to change, which the row says
        // outright (OMS-FUN-PO-15.10) — a standing property of the record, so
        // the list mirrors it.
        rowState={row => (isRowRestricted(row.status) ? 'disabled' : undefined)}
        emptyMessage={t('error.no-purchase-orders')}
        empty={
          <Button
            variant="ghost"
            shortcut={ALT_N}
            data-testid="nothing-here-create-button"
            onClick={() => setCreateOpen(true)}
          >
            {t('button.create-a-new-one')}
          </Button>
        }
        enableSelection
        selectedIds={selectedIds()}
        onSelectionChange={onSelectionChange}
        // Delete is the one bulk action (spec S1 § selection actions). It is
        // NOT pre-screened on the selection's statuses: the server decides and
        // its verdict is reported per order (ui-standards/validation.md
        // § actions). Two separate callbacks, because the action re-queries
        // mid-flow so deleted rows disappear, but clears the selection — which
        // gates the footer, and with it the action's own dialog — only once
        // the interaction ends (issue #374).
        selectionActions={
          <DeletePurchaseOrdersAction
            storeId={params.storeId}
            selection={selection}
            refetchList={() => void refetch()}
            clearSelection={clearSelection}
          />
        }
        config={tableConfig.config()}
        setConfig={tableConfig.setConfig}
        configIsDefault={tableConfig.isConfigDefault()}
        onSaveGlobalDefault={
          tableConfig.canSaveGlobalDefault()
            ? tableConfig.saveGlobalTableConfig
            : undefined
        }
        // Server-paginated, reporting the whole filtered total. State stays
        // page-owned / URL-backed.
        pagination={{
          offset: query().offset,
          pageSize: query().first,
          total: totalCount(),
          onOffsetChange: offset => setQuery({ ...query(), offset }),
          // The chosen size is remembered for the next visit (D106).
          onPageSizeChange: first => {
            rememberPageSize(first);
            setQuery({ ...query(), first, offset: 0 });
          },
        }}
      />
      <CreatePurchaseOrderModal
        open={createOpen()}
        onClose={() => setCreateOpen(false)}
      />
    </Page>
  );
};

export default PurchaseOrdersList;
