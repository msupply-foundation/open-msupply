import { createMemo, createResource } from 'solid-js';
import type { Component } from 'solid-js';
import { graphqlFetch } from '@/api/graphql';
import { gated } from '@/api/gated';
import { localisedDateTime, t } from '@/intl';
import {
  DataTable,
  type Column,
  type SortState,
} from '@/ui/elements/table/DataTable';
import {
  getCellDefinition,
  getTextCell,
} from '@/ui/elements/table/tableHelpers';
import { remToPx } from '@/ui/utils/rem';
import { createTableConfig } from '@/api/createTableConfig';
import { clampPageOffset, settledTotal } from '@/list/clampPageOffset';
import { rememberPageSize } from '@/list/pageSize';
import { TemperatureLogs } from '../monitoring.generated';
import type {
  TemperatureLogRowFragment,
  TemperatureLogsVariables,
} from '../monitoring.generated';
import {
  LOG_SORT_KEYS,
  buildLogsVariables,
  type LogSortKey,
  type MonitoringState,
} from '../monitoring/monitoringState';
import { formatTemperature } from '../monitoring/breachDisplay';
import { BreachTypeCell } from '../monitoring/BreachTypeCell';

// T3 — the Log tab (spec/cold-chain-monitoring ui-surface T3): individual
// readings over the shared filter set, oldest first. Read-only: no row
// action, no selection, no detail. The reference client's always-blank CCE
// column is not reproduced (README › known gaps), nor its per-column filters.

export interface LogTabProps {
  storeId: string;
  state: MonitoringState;
  setState: (next: MonitoringState) => void;
  refreshVersion: number;
}

type LogRow = TemperatureLogRowFragment;
type SortKey = LogSortKey;

export const LogTab: Component<LogTabProps> = props => {
  const tableConfig = createTableConfig({
    tableId: 'temperature-logs',
    defaultConfig: { compact: { viewMode: 'card' } },
  });

  const variables = createMemo<TemperatureLogsVariables>(() =>
    buildLogsVariables(props.state, props.storeId)
  );

  const [data] = createResource(
    () => `${JSON.stringify(variables())}#${props.refreshVersion}`,
    async key => {
      const result = await graphqlFetch(
        TemperatureLogs,
        JSON.parse(
          key.slice(0, key.lastIndexOf('#'))
        ) as TemperatureLogsVariables
      );
      if (result.kind !== 'success') return undefined;
      return result.data.temperatureLogs;
    }
  );
  const page = () => gated(data);
  const rows = (): LogRow[] => page()?.nodes ?? [];
  const totalCount = () => page()?.totalCount ?? 0;

  clampPageOffset({
    total: () => settledTotal(data, page => page.totalCount),
    offset: () => props.state.logOffset,
    pageSize: () => props.state.first,
    setOffset: offset => props.setState({ ...props.state, logOffset: offset }),
  });

  const currentSort = (): SortState<SortKey> | undefined => {
    const s = props.state.logSort[0];
    return s ? { key: s.key, desc: s.desc ?? false } : undefined;
  };
  const onSort = (key: SortKey, desc: boolean) =>
    props.setState({ ...props.state, logSort: [{ key, desc }], logOffset: 0 });

  const columns = (): Column<LogRow, SortKey>[] => [
    {
      c: { accessor: row => localisedDateTime(row.datetime), id: 'datetime' },
      sortKey: LOG_SORT_KEYS[0],
      header: () => t('label.date-time'),
      ...getTextCell({ headerPosition: 'primary' }),
      size: remToPx(10),
    },
    {
      c: { accessor: row => row.sensor?.name ?? '', id: 'sensorName' },
      header: () => t('label.sensor-name'),
      ...getCellDefinition('name'),
    },
    {
      c: { accessor: row => row.location?.code ?? '', id: 'location' },
      header: () => t('label.location'),
      ...getCellDefinition('location'),
    },
    {
      // Every reading is a temperature — 0 °C included — with its unit.
      c: {
        accessor: row => formatTemperature(row.temperature),
        id: 'temperature',
      },
      sortKey: LOG_SORT_KEYS[1],
      header: () => t('label.temperature'),
      ...getTextCell({ align: 'right' }),
      size: remToPx(7),
    },
    {
      // Blank where the reading is not part of a breach (rules › the log).
      c: {
        accessor: row => row.temperatureBreach?.type ?? '',
        id: 'breachType',
      },
      header: () => t('label.breach-type'),
      ...getTextCell({ description: t('description.breach-type') }),
      size: remToPx(9),
      cell: info => (
        <BreachTypeCell type={info.row.original.temperatureBreach?.type} />
      ),
    },
  ];

  return (
    <DataTable
      columns={columns()}
      rows={rows()}
      rowKey={row => row.id}
      loading={data.loading}
      sort={currentSort()}
      onSort={onSort}
      emptyMessage={t('error.no-temperature-logs')}
      config={tableConfig.config()}
      setConfig={tableConfig.setConfig}
      onSaveGlobalDefault={
        tableConfig.canSaveGlobalDefault()
          ? tableConfig.saveGlobalTableConfig
          : undefined
      }
      pagination={{
        offset: props.state.logOffset,
        pageSize: props.state.first,
        total: totalCount(),
        onOffsetChange: offset =>
          props.setState({ ...props.state, logOffset: offset }),
        onPageSizeChange: first => {
          rememberPageSize(first);
          props.setState({
            ...props.state,
            first,
            breachOffset: 0,
            logOffset: 0,
          });
        },
      }}
    />
  );
};
