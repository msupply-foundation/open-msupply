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
import {
  FilterBar,
  FilterSelect,
  FilterDateTimeRange,
  constructFilters,
  type Filter,
  type FilterDef,
} from '../../../ui/elements/selectors/FilterBar';
import { createTableConfig } from '../../../api/createTableConfig';
import { useUrlQueryState } from '../../../list/urlQueryState';
import { initialPageSize, rememberPageSize } from '../../../list/pageSize';
import {
  ItemLedger,
  type ItemLedgerResult,
  type ItemLedgerVariables,
} from './itemLedger.generated';
import {
  buildWireFilter,
  type InvoiceStatus,
  type InvoiceType,
  type LedgerFilter,
} from './itemLedgerFilter';
import { ledgerRowHref } from './itemLedgerNav';

// The item detail's Ledger tab (spec/items S2 › Ledger tab, rules.md § the
// detail record). Server-paginated, fixed most-recent-first order — the
// endpoint has NO sort input (contract.md), unlike stock's own ledger
// (LedgerPanel.tsx), which is unpaginated and client-sortable; this one
// mirrors its query/table shape but adds pagination, filters, and
// row-navigation (OMS-REG-CAT-04.22/.24/.41/.42/.43). Its own query
// (kdd/state-management), independent of the itemDetail read.

type LedgerRow = ItemLedgerResult['itemLedger']['nodes'][number];

// The filter is its OWN key, never spread across the state's top level (as the
// items list does too). Both of FilterBar's chip operations depend on it:
//   • REMOVING a chip deletes its key, so the new filter must REPLACE the old
//     object — merged into a flat state, the deleted key just survives from the
//     previous value and the chip won't clear.
//   • ADDING a chip writes `<key>: null` (its added-but-empty marker), and
//     useUrlQueryState strips TOP-LEVEL nulls when it parses the URL — so a
//     flat null is erased on the round trip and the chip never appears at all.
// Nested, the whole filter object survives as one value and both work.
type LedgerState = { filter: LedgerFilter; offset: number; first: number };

const DEFAULT_PAGE_SIZE = 20;
// `datetime: null` SEEDS the date-time chip so it is on the bar from the first
// render with no menu step — this app's way of expressing the reference app's
// `isDefault: true` on that filter. A null bound never reaches the query, and
// the chip is still removable like any other (a URL whose filter object omits
// it wins over this default).
const DEFAULT_STATE: LedgerState = {
  filter: { datetime: null },
  offset: 0,
  first: DEFAULT_PAGE_SIZE,
};

// Widths (rem) for the two columns no preset key covers — an explicit helper
// carries rendering only, never a width (docs/CELL_TYPES.md § Width model), so
// these are set per column. Both are sized to their HEADER, which is wider than
// the values: "Status" holds a translated document status, "Change" a signed
// unit figure.
const STATUS_WIDTH_REM = 7.5;
const CHANGE_WIDTH_REM = 5;
// "Inventory adjustment" / "Outbound shipment" are the long ones.
const TYPE_WIDTH_REM = 11;
// The shared `invoiceNumber` preset is 3.5rem — right for the other consumer,
// whose header is just "#" — but this table spells out "Invoice number", which
// wraps at that width. A ONE-OFF override, per _globalColumnConfig's own
// guidance (change the shared value only when every consumer wants it).
// Calibrated against the `locationCode` key, whose 13-character header measured
// 8.5rem; this one is a character longer.
const INVOICE_NUMBER_WIDTH_REM = 9;

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

// The statuses the Status chip OFFERS — NEW and ALLOCATED are deliberately
// absent, matching the reference app's ledger filter. Both are pre-dispatch
// states in which no stock has moved (see InvoiceNodeStatus in schema.graphql:
// "No stock changes in this status"), so no ledger row can ever carry them and
// offering them would be a filter that always matches nothing. STATUS_LABEL
// above stays COMPLETE — it labels the Status column, which renders whatever
// the row carries.
const INVOICE_STATUSES: InvoiceStatus[] = [
  'PICKED',
  'SHIPPED',
  'DELIVERED',
  'RECEIVED',
  'VERIFIED',
  'CANCELLED',
];

// Every filter is a chip on the ONE bar — there is no control standing beside
// it (ui-standards § tables → toolbar/filtering). The date-time range leads,
// grouped under a single "Date/time" label exactly as the reference app groups
// its two dateTime elements under one filter, and is seeded present by
// DEFAULT_STATE above.
const buildLedgerFilters = (): Filter<LedgerFilter>[] =>
  constructFilters<LedgerFilter>({
    datetime: {
      label: () => t('label.datetime'),
      render: props => (
        <FilterDateTimeRange
          // Both bounds live in this one chip, so the group label is the chip's
          // and each field keeps its own accessible name.
          value={props.filter().datetime ?? { start: null, end: null }}
          onChange={range => props.setPartialFilter({ datetime: range })}
          fromLabel={t('label.from-datetime')}
          toLabel={t('label.to-datetime')}
          testId={props.testId}
        />
      ),
    } satisfies FilterDef<LedgerFilter>,
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
  });

export const ItemLedgerPanel: Component<{
  storeId: string;
  itemId: string;
}> = props => {
  const navigate = useNavigate();
  const { query, setQuery } = useUrlQueryState<LedgerState>({
    ...DEFAULT_STATE,
    first: initialPageSize(),
  });
  const filters = buildLedgerFilters();

  // Column config (order/sizing/pinning/visibility/density), resolved default →
  // global → user (kdd/table-state). It is also what puts the Columns and
  // Settings controls in the table's toolbar at all — DataTable renders both
  // only when `setConfig` is wired — so a table without it silently loses them.
  // 17 columns make this the tab that needs them most.
  const tableConfig = createTableConfig({ tableId: 'item-ledger' });

  // REPLACE the filter object, never merge into it — a chip removal is
  // expressed by the key's ABSENCE, which a merge would silently undo.
  const onFilterChange = (filter: LedgerFilter) =>
    setQuery({ ...query(), filter, offset: 0 });

  const variables = (): ItemLedgerVariables => ({
    storeId: props.storeId,
    page: { first: query().first, offset: query().offset },
    filter: buildWireFilter(props.itemId, query().filter),
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
  // value by hand. Only Type and Status keep an explicit `cell`, each needing a
  // label map no preset key can supply (there is no Status preset —
  // docs/CELL_TYPES.md § Status), so each pairs its cell with a width.
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
      size: remToPx(TYPE_WIDTH_REM),
      // The document type ALONE. The sibling stock ledger appends the invoice
      // number to this cell, but that table has no Invoice number column; this
      // one does (next column), so appending it printed the same value twice in
      // every row. ui-surface S2 › Ledger tab names this column as the
      // translated type label only, and so does the reference app.
      cell: info => TYPE_LABEL[info.row.original.invoiceType],
    },
    {
      c: { key: 'invoiceNumber' },
      header: () => t('label.invoice-number'),
      // Preset for the rendering (right-aligned, tabular, locale-formatted),
      // own width so the spelled-out header sits on one line.
      ...getCellDefinition('invoiceNumber'),
      size: remToPx(INVOICE_NUMBER_WIDTH_REM),
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
      // detail). ONE bar carries all three chips, the date-time range included
      // (seeded present, see DEFAULT_STATE) — nothing stands beside it.
      filters={
        <FilterBar
          filters={filters}
          filter={query().filter}
          onChange={onFilterChange}
        />
      }
      loading={data.loading}
      onRowClick={row => {
        const href = ledgerRowHref(props.storeId, row);
        if (href) navigate(href);
      }}
      emptyMessage={t('messages.no-item-ledger')}
      config={tableConfig.config()}
      setConfig={tableConfig.setConfig}
      configIsDefault={tableConfig.isConfigDefault()}
      // Central-server admins (EDIT_CENTRAL_DATA) can promote their layout to
      // the install-wide default; everyone else gets no action. Reactive gate.
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
        onPageSizeChange: first => {
          rememberPageSize(first);
          setQuery({ ...query(), first, offset: 0 });
        },
      }}
    />
  );
};
