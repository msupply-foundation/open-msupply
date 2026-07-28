import { createResource, type Component } from 'solid-js';
import { graphqlFetch } from '../../../api/graphql';
import { t } from '../../../intl';
import { localisedDate, localisedTime } from '../../../intl/formatDateTime';
import { DataTable, type Column } from '../../../ui/elements/table/DataTable';
import { createTableConfig } from '../../../api/createTableConfig';
import {
  SupplierReturnLog,
  type SupplierReturnLogResult,
} from './supplierReturnDetail.generated';

// The Log tab (spec/supplier-returns/ui-surface.md S3 § tabs): the return's
// activity history — creation, status changes, who and when — read from the
// shared activity log keyed by this record's id, newest first.

type LogConnector = Extract<
  SupplierReturnLogResult['activityLogs'],
  { __typename: 'ActivityLogConnector' }
>;
type LogRow = LogConnector['nodes'][number];

// The log's event types are an open server enum; show a readable fallback for
// anything unmapped rather than maintaining a full parallel map.
const eventLabel = (row: LogRow): string => {
  switch (row.type) {
    case 'INVOICE_CREATED':
      return t('label.created');
    case 'INVOICE_STATUS_PICKED':
      return t('status.picked');
    case 'INVOICE_STATUS_SHIPPED':
      return t('status.shipped');
    case 'INVOICE_STATUS_RECEIVED':
      return t('status.received');
    case 'INVOICE_STATUS_VERIFIED':
      return t('status.verified');
    default:
      return row.type.replaceAll('_', ' ').toLowerCase();
  }
};

export const LogTab: Component<{
  storeId: string;
  recordId: string;
}> = props => {
  const tableConfig = createTableConfig({ tableId: 'supplier-return-log' });

  // This tab mounts fresh when selected (inactive TabPanels unmount), so this
  // resource FIRST fetches on an interaction — it MUST be read non-suspending
  // via the `.state` gate, never `resource()` or `.latest` alone, or it
  // suspends the detail screen's Suspense and remounts it (kdd/solid-reactivity-
  // pitfalls › No remounts on interaction).
  const [data] = createResource(
    () => ({ storeId: props.storeId, recordId: props.recordId }),
    async variables => {
      const result = await graphqlFetch(SupplierReturnLog, variables);
      if (result.kind !== 'success') return undefined;
      return result.data.activityLogs.__typename === 'ActivityLogConnector'
        ? result.data.activityLogs.nodes
        : undefined;
    }
  );

  // Newest first, sorted client-side (the query doesn't depend on a server
  // sort). The `.state` gate: no value until ready/refreshing → never suspends.
  const rows = () => {
    const ready = data.state === 'ready' || data.state === 'refreshing';
    const nodes = ready ? (data.latest ?? []) : [];
    return [...nodes].sort((a, b) => (a.datetime < b.datetime ? 1 : -1));
  };

  const columns = (): Column<LogRow, never>[] => [
    {
      c: { accessor: row => localisedDate(row.datetime), id: 'date' },
      header: () => t('label.date'),
    },
    {
      c: { accessor: row => localisedTime(row.datetime), id: 'time' },
      header: () => t('label.time'),
    },
    {
      c: { accessor: row => row.user?.username ?? '', id: 'user' },
      header: () => t('label.user'),
    },
    {
      c: { accessor: eventLabel, id: 'event' },
      header: () => t('label.event'),
      meta: { wrapLines: 2 },
    },
  ];

  return (
    <DataTable
      columns={columns()}
      rows={rows()}
      rowKey={row => row.id}
      loading={data.loading}
      emptyMessage={t('messages.no-log-entries')}
      config={tableConfig.config()}
      setConfig={tableConfig.setConfig}
    />
  );
};
