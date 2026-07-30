import { createResource, type Component } from 'solid-js';
import { graphqlFetch } from '../../../api/graphql';
import { t } from '../../../intl';
import { DataTable, type Column } from '../../../ui/elements/table/DataTable';
import {
  getCellDefinition,
  getTextCell,
} from '../../../ui/elements/table/tableHelpers';
import { remToPx } from '../../../ui/utils/rem';
import { createTableConfig } from '../../../api/createTableConfig';
import {
  CustomerReturnLog,
  type CustomerReturnLogResult,
} from './customerReturnDetail.generated';

// The Log tab (spec/customer-returns/ui-surface.md S3 § tabs;
// OMS-REG-DIST-07.45): the
// return's activity history — creation, status changes, who and when — read
// from the shared activity log keyed by this record's id, newest first.

type LogConnector = Extract<
  CustomerReturnLogResult['activityLogs'],
  { __typename: 'ActivityLogConnector' }
>;
type LogRow = LogConnector['nodes'][number];

// The log's event types are an open server enum; show a readable fallback for
// anything unmapped rather than maintaining a full parallel map.
const eventLabel = (row: LogRow): string => {
  switch (row.type) {
    case 'INVOICE_CREATED':
      return t('label.created');
    case 'INVOICE_STATUS_RECEIVED':
      return t('status.received');
    case 'INVOICE_STATUS_VERIFIED':
      return t('status.verified');
    case 'INVOICE_STATUS_PICKED':
      return t('status.picked');
    case 'INVOICE_STATUS_SHIPPED':
      return t('status.shipped');
    default:
      return row.type.replaceAll('_', ' ').toLowerCase();
  }
};

export const LogTab: Component<{
  storeId: string;
  recordId: string;
}> = props => {
  const tableConfig = createTableConfig({ tableId: 'customer-return-log' });

  const [data] = createResource(
    () => ({ storeId: props.storeId, recordId: props.recordId }),
    async variables => {
      const result = await graphqlFetch(CustomerReturnLog, variables);
      if (result.kind !== 'success') return undefined;
      return result.data.activityLogs.__typename === 'ActivityLogConnector'
        ? result.data.activityLogs.nodes
        : undefined;
    }
  );

  // NON-suspending read (kdd/solid-reactivity-pitfalls § no remounts on
  // interaction): this resource FIRST fetches when the user opens the Log tab,
  // on an already-open detail screen. `.latest` alone suspends on that first
  // pending read, which would tear down the whole page (its Suspense boundary)
  // and remount it. The `.state` gate never suspends; `data.loading` stays the
  // table's spinner boolean.
  const loaded = () =>
    data.state === 'ready' || data.state === 'refreshing'
      ? (data.latest ?? [])
      : [];

  // Newest first, sorted client-side (the query doesn't depend on a server
  // sort).
  const rows = () =>
    [...loaded()].sort((a, b) => (a.datetime < b.datetime ? 1 : -1));

  // Date / time / user take their cell-type presets (rendering AND width —
  // docs/CELL_TYPES.md): the accessors hand over the raw instant and the
  // presets localise it, so the columns hold the value rather than a
  // pre-formatted string.
  const columns = (): Column<LogRow, never>[] => [
    {
      c: { accessor: row => row.datetime, id: 'date' },
      header: () => t('label.date'),
      ...getCellDefinition('date'),
    },
    {
      c: { accessor: row => row.datetime, id: 'time' },
      header: () => t('label.time'),
      ...getCellDefinition('time'),
    },
    {
      c: { accessor: row => row.user?.username ?? '', id: 'user' },
      header: () => t('label.user'),
      ...getCellDefinition('user'),
    },
    {
      // No CELL_DEF key for an event description — the explicit text helper
      // plus a call-site width, wrapping to two lines.
      c: { accessor: eventLabel, id: 'event' },
      header: () => t('label.event'),
      ...getTextCell({ wrapLines: 2 }),
      size: remToPx(18.75),
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
      configIsDefault={tableConfig.isConfigDefault()}
      // Central-server admins (EDIT_CENTRAL_DATA) can promote their layout to
      // the install-wide default.
      onSaveGlobalDefault={
        tableConfig.canSaveGlobalDefault()
          ? tableConfig.saveGlobalTableConfig
          : undefined
      }
    />
  );
};
