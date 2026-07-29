import { createMemo, createResource, type Component } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { graphqlFetch } from '../../../api/graphql';
import { t } from '../../../intl';
import { DataTable, type Column } from '../../../ui/elements/table/DataTable';
import {
  getCellDefinition,
  getNumberCell,
  getTextCell,
} from '../../../ui/elements/table/tableHelpers';
import { remToPx } from '../../../ui/utils/rem';
import { HStack } from '../../../ui/layout/Stack/HStack';
import { Text } from '../../../ui/elements/typography/Text';
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

// Widths (rem) for the two columns no preset key covers — an explicit helper
// carries rendering only, never a width (docs/CELL_TYPES.md § Width model), so
// these are set per column. Both are sized to their HEADER, which is wider than
// the values: "Status" holds a translated document status, "Change" a signed
// unit figure.
const STATUS_WIDTH_REM = 7.5;
const CHANGE_WIDTH_REM = 5;

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
          // NARROW, never assert: the chip hands back a bare string (a stale
          // URL could carry anything), so match it against the known members
          // rather than casting it into the enum.
          onChange={value =>
            props.setPartialFilter({
              invoiceType: INVOICE_TYPES.find(v => v === value) ?? null,
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
          // Narrowed, not asserted — as with the type chip above.
          onChange={value =>
            props.setPartialFilter({
              invoiceStatus: INVOICE_STATUSES.find(v => v === value) ?? null,
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

  // Read WITHOUT suspending: this panel mounts when its TAB is opened, so its
  // FIRST read is pending under the already-open detail screen's <Suspense> —
  // a suspending read there tears down and remounts the whole screen. `.latest`
  // alone is not enough (it suspends on the first pending read), so gate on
  // `.state` (kdd/solid-reactivity-pitfalls § no remounts on interaction).
  const ready = () =>
    data.state === 'ready' || data.state === 'refreshing'
      ? data.latest
      : undefined;
  const rows = (): LedgerRow[] => ready()?.nodes ?? [];
  const totalCount = (): number => ready()?.totalCount ?? 0;

  // Cell rendering, alignment AND width come from the shared presets
  // (docs/CELL_TYPES.md) — the Date/Time pair, the numbers, the money columns
  // and the text columns are all standard types, so nothing here formats a
  // value by hand. Mirrors the sibling stock ledger (stock/detail/LedgerPanel),
  // the same table shape. Only Type and Status keep an explicit `cell`: Type
  // composes two fields, and Status needs a label map no key can supply (there
  // is no Status preset — docs/CELL_TYPES.md § Status), so each pairs its cell
  // with an explicit width.
  //
  // createMemo, NOT a plain function: this array is read by TanStack, which
  // memoizes on its REFERENCE — a fresh array per read invalidates four layers
  // of its internal memo chain, and 17 columns is exactly the scale that hurts
  // (kdd/solid-reactivity-pitfalls §14). It still re-derives on a language
  // switch, since every header reads t().
  const columns = createMemo((): Column<LedgerRow, never>[] => [
    {
      c: { accessor: l => l.invoiceType, id: 'type' },
      header: () => t('label.type'),
      ...getTextCell(),
      cell: info =>
        `${TYPE_LABEL[info.row.original.invoiceType]} ${info.row.original.invoiceNumber}`,
    },
    {
      c: { key: 'invoiceNumber' },
      header: () => t('label.invoice-number'),
      ...getCellDefinition('invoiceNumber'),
    },
    {
      c: { accessor: l => l.datetime, id: 'date' },
      header: () => t('label.date'),
      ...getCellDefinition('date'),
    },
    {
      c: { accessor: l => l.datetime, id: 'time' },
      header: () => t('label.time'),
      ...getCellDefinition('time'),
    },
    {
      c: { key: 'name' },
      header: () => t('label.name'),
      ...getCellDefinition('name'),
    },
    {
      c: { accessor: l => l.invoiceStatus, id: 'status' },
      header: () => t('label.status'),
      ...getTextCell(),
      size: remToPx(STATUS_WIDTH_REM),
      cell: info => STATUS_LABEL[info.row.original.invoiceStatus],
    },
    {
      c: { accessor: l => l.expiryDate, id: 'expiry' },
      header: () => t('label.expiry'),
      // The expiry preset, so a near-expiry date carries the app-wide warning
      // tone (≤3 months) instead of reading as a plain date.
      ...getCellDefinition('expiryDate'),
    },
    {
      c: { accessor: l => l.batch ?? '', id: 'batch' },
      header: () => t('label.batch'),
      ...getCellDefinition('batch'),
    },
    {
      c: { key: 'packSize' },
      header: () => t('label.pack-size'),
      ...getCellDefinition('packSize'),
    },
    {
      c: { key: 'numberOfPacks' },
      header: () => t('label.num-packs'),
      ...getCellDefinition('numberOfPacks'),
    },
    {
      c: { accessor: l => l.movementInUnits, id: 'change' },
      header: () => t('label.change'),
      // Signed units — a number with no common key, so the explicit helper
      // plus its own width (the header "Change" is the binding constraint).
      ...getNumberCell(),
      size: remToPx(CHANGE_WIDTH_REM),
    },
    {
      c: { key: 'balance' },
      header: () => t('label.balance'),
      ...getCellDefinition('balance'),
    },
    {
      c: { key: 'costPricePerPack' },
      header: () => t('label.pack-cost-price'),
      ...getCellDefinition('costPricePerPack'),
    },
    {
      c: { key: 'sellPricePerPack' },
      header: () => t('label.pack-sell-price'),
      ...getCellDefinition('sellPricePerPack'),
    },
    {
      // Accessor left nullable so an absent total renders BLANK, not $0.00
      // (the currency preset renders null as an empty cell).
      c: { accessor: l => l.totalBeforeTax, id: 'totalBeforeTax' },
      header: () => t('label.total-before-tax'),
      ...getCellDefinition('totalBeforeTax'),
    },
    {
      c: { accessor: l => l.reason ?? '', id: 'reason' },
      header: () => t('label.reason'),
      ...getTextCell(),
    },
    {
      c: { accessor: l => l.user?.username ?? '', id: 'user' },
      header: () => t('label.user'),
      ...getCellDefinition('user'),
    },
  ]);

  return (
    <DataTable
      columns={columns()}
      rows={rows()}
      rowKey={l => l.id}
      // Filters render in the TABLE's toolbar, never a page-level band above it
      // (ui-standards § tables → toolbar — binding for every table, list or
      // detail). The always-present date-time range sits beside the chip bar
      // (ui-surface S2 › Ledger tab), so the pair carries its own rhythm; the
      // toolbar slot sets no gap of its own.
      filters={
        <HStack gap="sm" wrap>
          {/* The range's two fields hide their own labels, so this names the
              PAIR on screen (ui-surface: "grouped as Date/time"); each field
              keeps its own accessible name from fromLabel/toLabel. */}
          <Text variant="bodySmall">{t('label.datetime')}</Text>
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
        </HStack>
      }
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
  );
};
