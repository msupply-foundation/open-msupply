import { createResource, type Component } from 'solid-js';
import { graphqlFetch } from '../../../api/graphql';
import { t } from '../../../intl';
import { localisedDate, localisedTime } from '../../../intl/formatDateTime';
import { DataTable, type Column } from '../../../ui/elements/table/DataTable';
import {
  getCellDefinition,
  getTextCell,
} from '../../../ui/elements/table/tableHelpers';
import { remToPx } from '../../../ui/utils/rem';
import { createTableConfig } from '../../../api/createTableConfig';
import {
  OutboundActivityLogs,
  type OutboundActivityLogsResult,
} from './outboundDetail.generated';

// The Log tab (spec S3 § tabs, OMS-REG-DIST-02.30): the shipment's activity
// history — status changes, who, when. Read-only; fetched when the tab first
// mounts (inactive tab panels are unmounted).

type LogRow = Extract<
  OutboundActivityLogsResult['activityLogs'],
  { __typename: 'ActivityLogConnector' }
>['nodes'][number];

export const LogTab: Component<{
  storeId: string;
  recordId: string;
}> = props => {
  const tableConfig = createTableConfig({ tableId: 'outbound-log' });
  const [data] = createResource(
    () => ({ storeId: props.storeId, recordId: props.recordId }),
    async variables => {
      const result = await graphqlFetch(OutboundActivityLogs, variables);
      if (result.kind !== 'success') return [];
      return result.data.activityLogs.__typename === 'ActivityLogConnector'
        ? [...result.data.activityLogs.nodes].sort((a, b) =>
            a.datetime < b.datetime ? -1 : 1
          )
        : [];
    }
  );
  const rows = () =>
    data.state === 'ready' || data.state === 'refreshing'
      ? (data.latest ?? [])
      : [];

  // Event label: the log type, humanised (INVOICE_STATUS_SHIPPED → "Invoice
  // status shipped"), with the `to` value appended where the server carries
  // one. Log types are an open server set, so no per-type catalogue.
  const eventLabel = (row: LogRow): string => {
    const type = row.type
      .toLowerCase()
      .replaceAll('_', ' ')
      .replace(/^./, first => first.toUpperCase());
    return row.to ? `${type} — ${row.to}` : type;
  };

  // Date + Time as a PAIR over the same instant — the house shape for any log /
  // ledger / history table (CELL_TYPES.md § Time), shared with the returns,
  // inbound, ledger and VVM-history tables.
  const columns = (): Column<LogRow, never>[] => [
    {
      c: { accessor: row => localisedDate(row.datetime), id: 'date' },
      header: () => t('label.date'),
      ...getCellDefinition('date'),
    },
    {
      c: { accessor: row => localisedTime(row.datetime), id: 'time' },
      header: () => t('label.time'),
      ...getCellDefinition('time'),
    },
    {
      c: { accessor: row => row.user?.username ?? '', id: 'user' },
      header: () => t('label.user'),
      ...getCellDefinition('user'),
    },
    {
      c: { accessor: row => eventLabel(row), id: 'event' },
      header: () => t('label.event'),
      // No CELL_DEF key — the event phrase is the row's widest text.
      ...getTextCell({ wrapLines: 2 }),
      size: remToPx(12),
    },
  ];

  return (
    <DataTable
      columns={columns()}
      rows={rows()}
      rowKey={row => row.id}
      loading={data.loading}
      showFullScreen={false}
      emptyMessage={t('messages.no-log-entries')}
      config={tableConfig.config()}
      setConfig={tableConfig.setConfig}
    />
  );
};
