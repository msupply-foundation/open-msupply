import { createResource, type Component } from 'solid-js';
import { graphqlFetch } from '../../../api/graphql';
import { t } from '../../../intl';
import { localisedDate, localisedTime } from '../../../intl/formatDateTime';
import { DataTable, type Column } from '../../../ui/elements/table/DataTable';
import { createTableConfig } from '../../../api/createTableConfig';
import {
  RequisitionLog,
  type RequisitionLogResult,
} from './requisitionDetail.generated';

// The Log tab (spec/requisitions S2 § Log tab; AC-LG1): the requisition's
// activity trail — Created and Finalised, a transferred requisition's creation
// and an automatic finalisation naming the system actor — read from the shared
// activity log keyed by this record's id, oldest first. Read-only; no
// selection, no pagination (the trail is short). Details renders an event's
// change description where it carries one — always empty for this record's
// events (rules › activity log).

type LogConnector = Extract<
  RequisitionLogResult['activityLogs'],
  { __typename: 'ActivityLogConnector' }
>;
type LogRow = LogConnector['nodes'][number];

// The requisition's lifecycle events (rules › activity log). An unrecognised
// type falls back to its raw name rather than maintaining a full parallel map.
const eventLabel = (row: LogRow): string => {
  switch (row.type) {
    case 'REQUISITION_CREATED':
      return t('log.requisition-created');
    case 'REQUISITION_STATUS_FINALISED':
      return t('log.requisition-status-finalised');
    default:
      return row.type.replaceAll('_', ' ').toLowerCase();
  }
};

export const RequisitionLogTab: Component<{
  storeId: string;
  recordId: string;
}> = props => {
  const tableConfig = createTableConfig({ tableId: 'requisition-log' });

  const [data] = createResource(
    () => ({ storeId: props.storeId, recordId: props.recordId }),
    async variables => {
      const result = await graphqlFetch(RequisitionLog, variables);
      if (result.kind !== 'success') return undefined;
      return result.data.activityLogs.__typename === 'ActivityLogConnector'
        ? result.data.activityLogs.nodes
        : undefined;
    }
  );

  // Oldest first (AC-LG1), sorted client-side.
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
    {
      // A change description where the event carries one — always empty for
      // this record's events (that surface exists for other record types
      // sharing the trail machinery).
      c: { accessor: row => row.to ?? '', id: 'details' },
      header: () => t('label.details'),
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
