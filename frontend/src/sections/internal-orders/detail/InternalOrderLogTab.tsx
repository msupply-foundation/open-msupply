import { createResource, type Component } from 'solid-js';
import { graphqlFetch } from '../../../api/graphql';
import { t } from '../../../intl';
import { localisedDate, localisedTime } from '../../../intl/formatDateTime';
import { DataTable, type Column } from '../../../ui/elements/table/DataTable';
import { createTableConfig } from '../../../api/createTableConfig';
import {
  InternalOrderLog,
  type InternalOrderLogResult,
} from './internalOrderDetail.generated';

// The Log tab (spec/internal-orders S3 § Log tab; AC-AL1): the order's activity
// trail — created, sent, approved, finalised — read from the shared activity
// log keyed by this record's id, OLDEST first. Read-only; no selection, no
// pagination (the trail is short).

type LogConnector = Extract<
  InternalOrderLogResult['activityLogs'],
  { __typename: 'ActivityLogConnector' }
>;
type LogRow = LogConnector['nodes'][number];

// The order's lifecycle events (rules › activity log). An unrecognised type
// falls back to its raw name rather than maintaining a full parallel map.
const eventLabel = (row: LogRow): string => {
  switch (row.type) {
    case 'REQUISITION_CREATED':
      return t('log.requisition-created');
    case 'REQUISITION_STATUS_SENT':
      return t('log.requisition-status-sent');
    case 'REQUISITION_APPROVED':
      return t('log.requisition-approved');
    case 'REQUISITION_STATUS_FINALISED':
      return t('log.requisition-status-finalised');
    default:
      return row.type.replaceAll('_', ' ').toLowerCase();
  }
};

export const InternalOrderLogTab: Component<{
  storeId: string;
  recordId: string;
}> = props => {
  const tableConfig = createTableConfig({ tableId: 'internal-order-log' });

  const [data] = createResource(
    () => ({ storeId: props.storeId, recordId: props.recordId }),
    async variables => {
      const result = await graphqlFetch(InternalOrderLog, variables);
      if (result.kind !== 'success') return undefined;
      return result.data.activityLogs.__typename === 'ActivityLogConnector'
        ? result.data.activityLogs.nodes
        : undefined;
    }
  );

  // Oldest first (AC-AL1), sorted client-side.
  const rows = () =>
    [...(data.latest ?? [])].sort((a, b) => (a.datetime < b.datetime ? -1 : 1));

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
