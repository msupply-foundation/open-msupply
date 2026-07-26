import { createResource, type Component } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { graphqlFetch } from '../../../api/graphql';
import { t } from '../../../intl';
import { localisedDate, localisedTime } from '../../../intl/formatDateTime';
import { formatNumber } from '../../../intl/formatNumber';
import { DataTable, type Column } from '../../../ui/elements/table/DataTable';
import {
  FilterBar,
  FilterSelect,
  FilterDateTimeRange,
  constructFilters,
  type Filter,
  type FilterDef,
  type IsoDateTimeRange,
} from '../../../ui/elements/selectors/FilterBar';
import { useUrlQueryState } from '../../../list/urlQueryState';
import {
  ItemLedger,
  type ItemLedgerResult,
  type ItemLedgerVariables,
} from './itemLedger.generated';
import { ledgerRowHref } from './itemLedgerNav';

// The item detail's Ledger tab (spec/items S2 › Ledger tab, rules.md § the
// detail record). Server-paginated, fixed most-recent-first order — the
// endpoint has NO sort input (contract.md), unlike stock's own ledger
// (LedgerPanel.tsx), which is unpaginated and client-sortable; this one
// mirrors its query/table shape but adds pagination, filters, and
// row-navigation (OMS-REG-CAT-04.22/.24/.41/.42/.43). Its own query
// (kdd/state-management), independent of the itemDetail read.

type LedgerRow = ItemLedgerResult['itemLedger']['nodes'][number];
type InvoiceType = LedgerRow['invoiceType'];
type InvoiceStatus = LedgerRow['invoiceStatus'];

type LedgerFilter = {
  invoiceType?: InvoiceType | null;
  invoiceStatus?: InvoiceStatus | null;
  from?: string | null;
  to?: string | null;
};

type LedgerState = LedgerFilter & { offset: number; first: number };

const DEFAULT_PAGE_SIZE = 20;
const DEFAULT_STATE: LedgerState = { offset: 0, first: DEFAULT_PAGE_SIZE };

// The document-type / status labels (spec ui-surface.md § Ledger tab
// columns) — explicit per-vertical lookups (kdd/explicit-composition), not a
// shared cross-vertical mapper; INVENTORY_ADDITION/_REDUCTION both render via
// the single "Inventory adjustment" label (captured as-is).
const TYPE_LABEL: Record<InvoiceType, string> = {
  get OUTBOUND_SHIPMENT() {
    return t('label.outbound-shipment');
  },
  get INBOUND_SHIPMENT() {
    return t('label.inbound-shipment');
  },
  get PRESCRIPTION() {
    return t('label.prescription');
  },
  get INVENTORY_ADDITION() {
    return t('label.inventory-adjustment');
  },
  get INVENTORY_REDUCTION() {
    return t('label.inventory-adjustment');
  },
  get SUPPLIER_RETURN() {
    return t('label.supplier-return');
  },
  get CUSTOMER_RETURN() {
    return t('label.customer-return');
  },
  get REPACK() {
    return t('label.repack');
  },
};

const STATUS_LABEL: Record<InvoiceStatus, string> = {
  get NEW() {
    return t('label.new');
  },
  get ALLOCATED() {
    return t('label.allocated');
  },
  get PICKED() {
    return t('label.picked');
  },
  get SHIPPED() {
    return t('label.shipped');
  },
  get DELIVERED() {
    return t('label.delivered');
  },
  get RECEIVED() {
    return t('label.received');
  },
  get VERIFIED() {
    return t('label.verified');
  },
  get CANCELLED() {
    return t('label.cancelled');
  },
};

const INVOICE_TYPES: InvoiceType[] = [
  'OUTBOUND_SHIPMENT',
  'INBOUND_SHIPMENT',
  'PRESCRIPTION',
  'INVENTORY_ADDITION',
  'INVENTORY_REDUCTION',
  'SUPPLIER_RETURN',
  'CUSTOMER_RETURN',
  'REPACK',
];

const INVOICE_STATUSES: InvoiceStatus[] = [
  'NEW',
  'ALLOCATED',
  'PICKED',
  'SHIPPED',
  'DELIVERED',
  'RECEIVED',
  'VERIFIED',
  'CANCELLED',
];

// Only invoiceType/invoiceStatus are addable FilterBar chips; from/to render
// as an always-present control beside the bar (dismissed here — same shape
// as the items list's always-present code-or-name search, listFilters.tsx).
const buildLedgerFilters = (): Filter<LedgerFilter>[] =>
  constructFilters<LedgerFilter>({
    invoiceType: {
      label: () => t('label.type'),
      render: props => (
        <FilterSelect
          label={t('label.type')}
          testId={props.testId}
          value={props.filter().invoiceType ?? ''}
          options={[
            { value: '', label: t('label.any') },
            ...INVOICE_TYPES.map(v => ({ value: v, label: TYPE_LABEL[v] })),
          ]}
          onChange={value =>
            props.setPartialFilter({
              invoiceType: (value || null) as InvoiceType | null,
            })
          }
        />
      ),
    } satisfies FilterDef<LedgerFilter>,
    invoiceStatus: {
      label: () => t('label.status'),
      render: props => (
        <FilterSelect
          label={t('label.status')}
          testId={props.testId}
          value={props.filter().invoiceStatus ?? ''}
          options={[
            { value: '', label: t('label.any') },
            ...INVOICE_STATUSES.map(v => ({
              value: v,
              label: STATUS_LABEL[v],
            })),
          ]}
          onChange={value =>
            props.setPartialFilter({
              invoiceStatus: (value || null) as InvoiceStatus | null,
            })
          }
        />
      ),
    } satisfies FilterDef<LedgerFilter>,
    from: null,
    to: null,
  });

const buildWireFilter = (
  itemId: string,
  f: LedgerFilter
): NonNullable<ItemLedgerVariables['filter']> => {
  const filter: NonNullable<ItemLedgerVariables['filter']> = {
    itemId: { equalTo: itemId },
  };
  if (f.invoiceType) filter.invoiceType = { equalTo: f.invoiceType };
  if (f.invoiceStatus) filter.invoiceStatus = { equalTo: f.invoiceStatus };
  if (f.from || f.to) {
    filter.datetime = {
      ...(f.from ? { afterOrEqualTo: f.from } : {}),
      ...(f.to ? { beforeOrEqualTo: f.to } : {}),
    };
  }
  return filter;
};

export const ItemLedgerPanel: Component<{
  storeId: string;
  itemId: string;
}> = props => {
  const navigate = useNavigate();
  const { query, setQuery } = useUrlQueryState<LedgerState>(DEFAULT_STATE);
  const filters = buildLedgerFilters();

  const onFilterChange = (filter: LedgerFilter) =>
    setQuery({ ...query(), ...filter, offset: 0 });

  const variables = (): ItemLedgerVariables => ({
    storeId: props.storeId,
    page: { first: query().first, offset: query().offset },
    filter: buildWireFilter(props.itemId, query()),
  });

  const [data] = createResource(
    () => JSON.stringify(variables()),
    async serialised => {
      const result = await graphqlFetch(
        ItemLedger,
        JSON.parse(serialised) as ItemLedgerVariables
      );
      if (result.kind !== 'success') return undefined;
      return result.data.itemLedger;
    }
  );

  const rows = (): LedgerRow[] => data.latest?.nodes ?? [];
  const totalCount = (): number => data.latest?.totalCount ?? 0;

  const columns = (): Column<LedgerRow, never>[] => [
    {
      c: { accessor: l => l.invoiceType, id: 'type' },
      header: t('label.type'),
      cell: info =>
        `${TYPE_LABEL[info.row.original.invoiceType]} ${info.row.original.invoiceNumber}`,
    },
    {
      c: { key: 'invoiceNumber' },
      header: t('label.invoice-number'),
      meta: { align: 'right' },
    },
    {
      c: { accessor: l => l.datetime, id: 'date' },
      header: t('label.date'),
      cell: info => localisedDate(info.row.original.datetime),
    },
    {
      c: { accessor: l => l.datetime, id: 'time' },
      header: t('label.time'),
      cell: info => localisedTime(info.row.original.datetime),
    },
    { c: { key: 'name' }, header: t('label.name') },
    {
      c: { accessor: l => l.invoiceStatus, id: 'status' },
      header: t('label.status'),
      cell: info => STATUS_LABEL[info.row.original.invoiceStatus],
    },
    {
      c: { accessor: l => l.expiryDate ?? '', id: 'expiry' },
      header: t('label.expiry'),
      cell: info =>
        info.row.original.expiryDate
          ? localisedDate(info.row.original.expiryDate)
          : '',
    },
    {
      c: { accessor: l => l.batch ?? '', id: 'batch' },
      header: t('label.batch'),
    },
    {
      c: { key: 'packSize' },
      header: t('label.pack-size'),
      meta: { align: 'right' },
      cell: info => formatNumber(info.row.original.packSize),
    },
    {
      c: { key: 'numberOfPacks' },
      header: t('label.num-packs'),
      meta: { align: 'right' },
      cell: info => formatNumber(info.row.original.numberOfPacks),
    },
    {
      c: { accessor: l => l.movementInUnits, id: 'change' },
      header: t('label.change'),
      meta: { align: 'right' },
      cell: info => formatNumber(info.row.original.movementInUnits),
    },
    {
      c: { key: 'balance' },
      header: t('label.balance'),
      meta: { align: 'right' },
      cell: info => formatNumber(info.row.original.balance),
    },
    {
      c: { key: 'costPricePerPack' },
      header: t('label.pack-cost-price'),
      meta: { align: 'right' },
      cell: info =>
        formatNumber(info.row.original.costPricePerPack, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
    },
    {
      c: { key: 'sellPricePerPack' },
      header: t('label.pack-sell-price'),
      meta: { align: 'right' },
      cell: info =>
        formatNumber(info.row.original.sellPricePerPack, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
    },
    {
      c: { accessor: l => l.totalBeforeTax ?? 0, id: 'totalBeforeTax' },
      header: t('label.total-before-tax'),
      meta: { align: 'right' },
      cell: info =>
        info.row.original.totalBeforeTax == null
          ? ''
          : formatNumber(info.row.original.totalBeforeTax, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }),
    },
    {
      c: { accessor: l => l.reason ?? '', id: 'reason' },
      header: t('label.reason'),
    },
    {
      c: { accessor: l => l.user?.username ?? '', id: 'user' },
      header: t('label.user'),
    },
  ];

  return (
    <>
      <div
        style={{
          display: 'flex',
          gap: '0.75rem',
          'align-items': 'center',
          'margin-block-end': '1rem',
        }}
      >
        {t('label.datetime')}
        <FilterDateTimeRange
          value={
            {
              start: query().from ?? null,
              end: query().to ?? null,
            } satisfies IsoDateTimeRange
          }
          onChange={range =>
            onFilterChange({ from: range.start, to: range.end })
          }
          fromLabel={t('label.from-datetime')}
          toLabel={t('label.to-datetime')}
          testId="filter-input-datetime"
        />
        <FilterBar
          filters={filters}
          filter={query()}
          onChange={onFilterChange}
        />
      </div>
      <DataTable
        columns={columns()}
        rows={rows()}
        rowKey={l => l.id}
        loading={data.loading}
        onRowClick={row => {
          const href = ledgerRowHref(props.storeId, row);
          if (href) navigate(href);
        }}
        emptyMessage={t('messages.no-item-ledger')}
        pagination={{
          offset: query().offset,
          pageSize: query().first,
          total: totalCount(),
          onOffsetChange: offset => setQuery({ ...query(), offset }),
          onPageSizeChange: first => setQuery({ ...query(), first, offset: 0 }),
        }}
      />
    </>
  );
};
