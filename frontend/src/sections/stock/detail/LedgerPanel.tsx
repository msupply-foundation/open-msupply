import {
  createResource,
  createSignal,
  Suspense,
  type Component,
} from 'solid-js';
import { graphqlFetch } from '../../../api/graphql';
import { t } from '../../../intl';
import { localisedDate, localisedTime } from '../../../intl/formatDateTime';
import { formatNumber } from '../../../intl/formatNumber';
import { Spinner } from '../../../ui/elements/feedback/Spinner';
import {
  DataTable,
  type Column,
  type SortState,
} from '../../../ui/elements/table/DataTable';
import {
  StockLedger,
  type StockLedgerVariables,
  type StockLedgerResult,
} from './stockLine.generated';

// The stock-line detail "Ledger" tab (spec/stock S2 › ledger). A read-only,
// non-paginated table of the line's movements, newest-first by default and
// sortable. Quantities and running balances are in UNITS (signed: in positive,
// out negative). Its own query (kdd/state-management), independent of the
// detail form.

type Ledger = StockLedgerResult['ledger']['nodes'][number];

type SortKey = NonNullable<StockLedgerVariables['sort']>[number]['key'];

// A document-type label: humanise the InvoiceNodeType enum (title-cased words).
const typeLabel = (invoiceType: string): string =>
  invoiceType
    .toLowerCase()
    .split('_')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

export const LedgerPanel: Component<{
  storeId: string;
  stockLineId: string;
}> = props => {
  const [sort, setSort] = createSignal<
    NonNullable<StockLedgerVariables['sort']>
  >([{ key: 'datetime', desc: true }]);

  const variables = (): StockLedgerVariables => ({
    storeId: props.storeId,
    filter: { stockLineId: { equalTo: props.stockLineId } },
    sort: sort(),
  });

  const [data] = createResource(
    () => JSON.stringify(variables()),
    async serialised => {
      const result = await graphqlFetch(
        StockLedger,
        JSON.parse(serialised) as StockLedgerVariables
      );
      if (result.kind !== 'success') return undefined;
      return result.data.ledger;
    }
  );

  const rows = (): Ledger[] => data.latest?.nodes ?? [];

  const currentSort = (): SortState<SortKey> => ({
    key: sort()[0]?.key ?? 'datetime',
    desc: sort()[0]?.desc ?? true,
  });
  const onSort = (key: SortKey, desc: boolean) => setSort([{ key, desc }]);

  const columns = (): Column<Ledger, SortKey>[] => [
    {
      c: { accessor: l => l.datetime, id: 'date' },
      sortKey: 'datetime',
      header: t('label.date'),
      cell: info => localisedDate(info.row.original.datetime),
    },
    {
      c: { accessor: l => l.datetime, id: 'time' },
      header: t('label.time'),
      meta: { align: 'right' },
      cell: info => localisedTime(info.row.original.datetime),
    },
    {
      c: { key: 'name' },
      sortKey: 'name',
      header: t('label.name'),
    },
    {
      c: { accessor: l => l.quantity, id: 'quantity' },
      sortKey: 'quantity',
      header: t('label.unit-quantity'),
      meta: { align: 'right' },
      cell: info => formatNumber(info.row.original.quantity),
    },
    {
      c: { accessor: l => l.runningBalance, id: 'balance' },
      header: t('label.balance'),
      meta: { align: 'right' },
      cell: info => formatNumber(info.row.original.runningBalance),
    },
    {
      c: { accessor: l => l.invoiceType, id: 'type' },
      sortKey: 'invoiceType',
      header: t('label.type'),
      cell: info =>
        `${typeLabel(info.row.original.invoiceType)} ${info.row.original.invoiceNumber}`,
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
    <Suspense fallback={<Spinner center />}>
      <DataTable
        columns={columns()}
        rows={rows()}
        rowKey={l => l.id}
        loading={data.loading}
        sort={currentSort()}
        onSort={onSort}
        emptyMessage={t('messages.no-ledger-entries')}
      />
    </Suspense>
  );
};
