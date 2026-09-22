import { createMemo, createResource } from 'solid-js';
import type { Component } from 'solid-js';
import { useNavigate, useParams } from '@solidjs/router';
import { graphqlFetch } from '@/api/graphql';
import { t } from '@/intl';
import { Page } from '@/ui/layout/Page/Page';
import { Header } from '@/ui/layout/Header/Header';
import { Breadcrumb } from '@/ui/layout/Header/Breadcrumb';
import { HeaderButtons } from '@/ui/layout/Header/HeaderButtons';
import {
  DataTable,
  type Column,
  type SortState,
} from '@/ui/elements/table/DataTable';
import {
  getCellDefinition,
  getDateCell,
  getNumberCell,
} from '@/ui/elements/table/tableHelpers';
import { remToPx } from '@/ui/utils/rem';
import { createTableConfig } from '@/api/createTableConfig';
import { FilterBar } from '@/ui/elements/selectors/FilterBar';
import { useUrlQueryState } from '@/list/urlQueryState';
import {
  DEFAULT_PAGE_SIZE,
  initialPageSize,
  rememberPageSize,
} from '@/list/pageSize';
import { clampPageOffset, settledTotal } from '@/list/clampPageOffset';
import { stripEmpty } from '@/typeHelpers';
import { OutstandingLines } from './outstandingLines.generated';
import type {
  OutstandingLineRowFragment,
  OutstandingLinesVariables,
} from './outstandingLines.generated';
import { filterFields, type OutstandingLineFilter } from './outstandingFilters';
import { ExportOutstandingLinesAction } from './actions';

// The outstanding-lines list (spec/purchase-orders S5) — every line the store
// is still waiting for, across all its orders, and the way to the order behind
// one. Reached only from S1's Outstanding lines action: it has no menu entry,
// and it sits behind the same procurement gate as S1, applied to the route by
// the navigation registry rather than by this screen.
//
// READ-ONLY: no create action, no row selection, no bulk-action bar, no action
// on a row. The export is the one page action, and a row click leaves for the
// line's ORDER (OMS-FUN-PO-14.9/.10).

type Row = OutstandingLineRowFragment;

// Typed to the generated sort-field union, so a column can only ever name a
// real sort key (kdd/type-safety). Three columns have none — the order's
// reference, its creating user and the supplier's code (contract § backend
// gaps) — and this FE sorts server-side, so those carry no sort control.
type SortKey = NonNullable<OutstandingLinesVariables['sort']>[number]['key'];

type ListState = {
  filter: OutstandingLineFilter;
  sort?: OutstandingLinesVariables['sort'];
  offset: number;
  first: number;
};

// The screen's ROW SET, fixed: a line that has been SENT and against which
// less has been received than the quantity expected of it (rules § listing
// outstanding lines). Merged over the user's own filters in `variables` rather
// than seeded into the URL state, so no hand-edited address can widen the list
// past what this screen is.
const ROW_SET = {
  status: { equalTo: 'SENT' },
  receivedLessThanAdjusted: true,
} as const satisfies OutstandingLineFilter;

// Default sort: highest PO number first (OMS-FUN-PO-14.8), declared in ONE
// place — the reference app constructs its table with a sort key that does not
// exist (`invoiceNumber`, a leftover from another vertical) and reaches this
// order only by its list hook's fallback (contract ⚠️ the default sort key
// does not exist). Supplier name is the list's one default filter, so its key
// is seeded present-but-empty (null, FilterBar's "added but empty" marker) and
// stripEmpty drops it from the query.
const DEFAULT_STATE: ListState = {
  filter: { supplierName: null },
  sort: [{ key: 'purchaseOrderNumber', desc: true }],
  offset: 0,
  first: DEFAULT_PAGE_SIZE,
};

const OutstandingLinesList: Component = () => {
  // storeId is guaranteed present: this section renders only inside
  // StoreGuardLayout, which requires a resolved store before routing.
  const params = useParams<{ storeId: string }>();
  const navigate = useNavigate();
  const { query, setQuery } = useUrlQueryState<ListState>({
    ...DEFAULT_STATE,
    first: initialPageSize(),
  });

  // Column config (order/sizing/pinning/visibility) by breakpoint band
  // (kdd/table-state). On COMPACT the default drops to CARD view and hides the
  // four columns that describe the ORDER rather than what is owed — its
  // reference, who created it, the supplier's code and when it was confirmed.
  // The three quantities all stay: they read across as arithmetic (what is
  // expected, what arrived, the difference), and a card showing one of them
  // without the other two would not.
  const tableConfig = createTableConfig({
    tableId: 'purchase-order-outstanding-lines',
    defaultConfig: {
      compact: {
        viewMode: 'card',
        columnVisibility: {
          reference: false,
          createdBy: false,
          supplierCode: false,
          confirmedDatetime: false,
        },
      },
    },
  });

  // Filter, sort and the fixed row set — everything but pagination, so the
  // export can be handed exactly this and fetch every page.
  const listVariables = createMemo<Omit<OutstandingLinesVariables, 'page'>>(
    () => ({
      storeId: params.storeId,
      // stripEmpty drops added-but-empty filter chips (held as null keys) and
      // any empty operator objects, so the query carries only live filters:
      // adding an empty chip does not reflash the list. ROW_SET goes on LAST —
      // it is not the user's to drop.
      filter: { ...stripEmpty(query().filter), ...ROW_SET },
      sort: query().sort,
    })
  );

  const variables = createMemo<OutstandingLinesVariables>(() => ({
    ...listVariables(),
    page: { first: query().first, offset: query().offset },
  }));

  // The resource SOURCE is the SERIALISED variables (a stable string), not the
  // variables object (kdd/solid-reactivity-pitfalls): two states with identical
  // query content produce an equal string, so the resource does not refetch.
  const [data] = createResource(
    () => JSON.stringify(variables()),
    async serialised => {
      const result = await graphqlFetch(
        OutstandingLines,
        JSON.parse(serialised) as OutstandingLinesVariables
      );
      if (result.kind !== 'success') return undefined;
      return result.data.purchaseOrderLines;
    }
  );

  // Read `data.latest`, NOT `data()`: `.latest` never suspends, so the table
  // mounts immediately and shows its own loading treatment instead of the page
  // going blank on a slow first load (#160/#196).
  const rows = (): Row[] => data.latest?.nodes ?? [];
  // The whole filtered set, not the page (rules § listing outstanding lines).
  const totalCount = () => data.latest?.totalCount ?? 0;

  // Nothing here deletes rows, but a filter narrowing to fewer pages can still
  // leave the offset past the new end (src/list/clampPageOffset.ts, #1117).
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
  const onFilterChange = (filter: OutstandingLineFilter) =>
    setQuery({ ...query(), filter, offset: 0 });

  // Opening a row opens that line's ORDER, not the line — the line has no
  // screen of its own (OMS-FUN-PO-14.9).
  const openRow = (row: Row) => {
    const id = row.purchaseOrder?.id;
    if (id) navigate(`/${params.storeId}/replenishment/purchase-order/${id}`);
  };

  // Columns and crumbs are accessors (not plain arrays): their text comes from
  // t(), which must be read in a reactive scope to re-translate on a language
  // switch.
  const columns = (): Column<Row, SortKey>[] => [
    {
      // The ORDER's number, not the line's (spec S5 column 1).
      c: { accessor: row => row.purchaseOrder?.number, id: 'number' },
      sortKey: 'purchaseOrderNumber',
      header: () => t('label.purchase-order-number'),
      ...getCellDefinition('purchaseOrderNumber'),
    },
    {
      c: {
        accessor: row => row.purchaseOrder?.reference ?? '',
        id: 'reference',
      },
      header: () => t('label.purchase-order-reference'),
      ...getCellDefinition('reference'),
    },
    {
      // Whoever created the ORDER.
      c: {
        accessor: row => row.purchaseOrder?.user?.username ?? '',
        id: 'createdBy',
      },
      header: () => t('label.created-by'),
      ...getCellDefinition('user'),
    },
    {
      c: {
        accessor: row => row.purchaseOrder?.supplier?.code ?? '',
        id: 'supplierCode',
      },
      header: () => t('label.supplier-code'),
      ...getCellDefinition('supplierCode'),
    },
    {
      c: {
        accessor: row => row.purchaseOrder?.supplier?.name ?? '',
        id: 'supplierName',
      },
      sortKey: 'supplierName',
      header: () => t('label.supplier-name'),
      // Narrower than the shared supplier-name default: eleven columns is a
      // wide table, and the row's identity here is the ITEM, so the item name
      // is the one column left to absorb the table's slack.
      ...getCellDefinition('supplierName', { wrapLines: 2 }),
      size: remToPx(12),
    },
    {
      // The line's item — the card's identity line, so it takes the primary
      // header slot.
      c: { accessor: row => row.item.name, id: 'itemName' },
      sortKey: 'itemName',
      header: () => t('label.item-name'),
      ...getCellDefinition('itemName', {
        headerPosition: 'primary',
        wrapLines: 2,
      }),
      // Narrower than the shared item-name default, which is the generic text
      // SINK (18.75rem) and sized for a table where it is the only long
      // column. Eleven columns here, five of them text, and the three
      // quantities at the end are the point of the screen — at the sink's
      // default they fall off the right edge on a laptop. Still the widest
      // column, still uncapped, so a long name can be dragged wider.
      size: remToPx(14),
    },
    {
      // The moment the ORDER became Ready for sending.
      c: {
        accessor: row => row.purchaseOrder?.confirmedDatetime,
        id: 'confirmedDatetime',
      },
      sortKey: 'purchaseOrderConfirmedDatetime',
      header: () => t('label.purchase-order-confirmed'),
      ...getCellDefinition('confirmedDatetime'),
    },
    {
      // The LINE's own expected delivery date, not its order's. The column a
      // user chasing late deliveries wants to sort on, and the server has the
      // key, so it is offered here — the reference app leaves it unsortable
      // (spec S5 column 8).
      c: { key: 'expectedDeliveryDate' },
      sortKey: 'expectedDeliveryDate',
      header: () => t('label.expected-delivery-date'),
      ...getDateCell(),
      size: remToPx(11),
    },
    {
      // What the ORDER expects of the line — its TOTAL, which the label says
      // outright so it cannot be read as the amount outstanding
      // (OMS-FUN-PO-14.2). Absent where the order carries no adjusted
      // quantity: blank, not 0, which would be a different fact
      // (ui-standards § absent values).
      c: { key: 'adjustedNumberOfUnits' },
      sortKey: 'adjustedNumberOfUnits',
      header: () => t('label.adjusted-units-expected'),
      ...getNumberCell(),
      size: remToPx(9),
    },
    {
      // What has ARRIVED against the line. Stock still in transit is not
      // counted, so a line whose shipment has left but not landed reads 0 here
      // and its whole quantity as outstanding (OMS-FUN-PO-14.5).
      c: { key: 'receivedNumberOfUnits' },
      sortKey: 'receivedNumberOfUnits',
      header: () => t('label.total-received'),
      ...getNumberCell(),
      size: remToPx(7),
    },
    {
      // The shortfall that put the row on the list — the server's own figure,
      // not one assembled here from the two columns beside it
      // (OMS-FUN-PO-14.13).
      c: { key: 'outstandingNumberOfUnits' },
      sortKey: 'outstandingNumberOfUnits',
      header: () => t('label.outstanding-units'),
      ...getNumberCell(),
      size: remToPx(8),
    },
  ];

  const crumbs = () => [
    {
      label: t('purchase-order'),
      to: `/${params.storeId}/replenishment/purchase-order`,
    },
    { label: t('outstanding-lines') },
  ];

  return (
    <Page
      fillBody
      header={
        <Header>
          <Breadcrumb crumbs={crumbs()} />
          <HeaderButtons>
            {/* Export the list as it stands (every page of the current filter,
                in the current order) as CSV or Excel — the screen's ONE page
                action (OMS-FUN-PO-14.10). */}
            <ExportOutstandingLinesAction
              storeId={params.storeId}
              variables={listVariables}
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
        // With nothing outstanding the list says so below its still-visible
        // headers (OMS-FUN-PO-14.4). No call to action: nothing is created
        // here.
        emptyMessage={t('message.no-outstanding-purchase-order-lines')}
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
    </Page>
  );
};

export default OutstandingLinesList;
