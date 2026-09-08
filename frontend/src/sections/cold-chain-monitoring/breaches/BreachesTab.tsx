import {
  createMemo,
  createResource,
  createSignal,
  Match,
  Show,
  Switch,
} from 'solid-js';
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
import { Comment } from '@/ui/elements/feedback/Comment';
import { IconButton } from '@/ui/elements/buttons/IconButton';
import { AlertCircleIcon } from '@/ui/icons';
import { remToPx } from '@/ui/utils/rem';
import { createTableConfig } from '@/api/createTableConfig';
import { clampPageOffset, settledTotal } from '@/list/clampPageOffset';
import { rememberPageSize } from '@/list/pageSize';
import { TemperatureBreaches } from '../monitoring.generated';
import type { TemperatureBreachesVariables } from '../monitoring.generated';
import {
  BREACH_SORT_KEYS,
  buildBreachesVariables,
  type BreachSortKey,
  type MonitoringState,
} from '../monitoring/monitoringState';
import {
  formatDuration,
  formatTemperature,
  hasTemperature,
  isOngoing,
  statusCell,
  statusLabelKey,
  type BreachRow,
  type StatusCell,
} from '../monitoring/breachDisplay';
import { BreachTypeCell } from '../monitoring/BreachTypeCell';
import { refetchNotifications } from '../notification/notificationStore';
import { AcknowledgeBreachModal } from './AcknowledgeBreachModal';
import styles from '../monitoring/monitoring.module.css';

// T2 — the Breaches tab (spec/cold-chain-monitoring ui-surface T2): the
// store's breaches over the shared filter set, newest first by start, with the
// acknowledge action on each unacknowledged row (S3 opens over it). No row
// selection and no row click — there is no detail screen, and the one per-row
// action is the status cell's.
//
// Deliberately absent: the reference client's CCE column, which has no backing
// fact on a breach and would ship permanently blank (README › known gaps);
// per-column filters, including the Status column's select — the filter bar
// is the whole filter surface, and the shared table has no column-filter
// capability (BUILD_REPORT › flags).

// The comment a status cell reveals, or null for the other two kinds — a
// plain function, so the <Match> narrows on a value rather than on a call.
const commentOf = (cell: StatusCell): string | null =>
  cell.kind === 'comment' ? cell.comment : null;

/**
 * Column 1's content: the acknowledge action, the comment, or nothing — by
 * the breach's state (rules › acknowledging a breach). The acknowledge action
 * is an alert glyph in the error tone; the comment is the shared hover
 * popover headed "Comment".
 */
const StatusActionCell: Component<{
  breach: BreachRow;
  onAcknowledge: () => void;
}> = props => {
  const cell = () => statusCell(props.breach);
  return (
    <Switch>
      <Match when={cell().kind === 'acknowledge'}>
        <IconButton
          icon={<AlertCircleIcon />}
          label={t('button.acknowledge')}
          variant="danger"
          size="small"
          data-testid="acknowledge-breach-button"
          onClick={() => props.onAcknowledge()}
        />
      </Match>
      <Match when={commentOf(cell())}>
        {comment => (
          <Comment comment={comment()} triggerTestId="breach-comment" />
        )}
      </Match>
    </Switch>
  );
};

/**
 * The Duration cell: an elapsed span derived from start and end — never
 * `durationMilliseconds`, which is 0 for an ongoing breach (contract ⚠️ wire
 * trap) — or the word Ongoing, emphasised as an exception.
 */
const DurationCell: Component<{ breach: BreachRow }> = props => (
  <Show
    when={!isOngoing(props.breach)}
    fallback={<em class={styles.ongoing}>{t('label.ongoing')}</em>}
  >
    {formatDuration(props.breach.startDatetime, props.breach.endDatetime!)}
  </Show>
);

export interface BreachesTabProps {
  storeId: string;
  state: MonitoringState;
  setState: (next: MonitoringState) => void;
  refreshVersion: number;
}

type SortKey = BreachSortKey;

export const BreachesTab: Component<BreachesTabProps> = props => {
  const tableConfig = createTableConfig({
    tableId: 'temperature-breaches',
    defaultConfig: { compact: { viewMode: 'card' } },
  });

  const variables = createMemo<TemperatureBreachesVariables>(() =>
    buildBreachesVariables(props.state, props.storeId)
  );

  const [data, { refetch }] = createResource(
    () => `${JSON.stringify(variables())}#${props.refreshVersion}`,
    async key => {
      const result = await graphqlFetch(
        TemperatureBreaches,
        JSON.parse(
          key.slice(0, key.lastIndexOf('#'))
        ) as TemperatureBreachesVariables
      );
      if (result.kind !== 'success') return undefined;
      return result.data.temperatureBreaches;
    }
  );
  // The gated read (kdd/solid-reactivity-pitfalls › no remounts, rule 2): the
  // table mounts with its own loading treatment, and a filter edit or a page
  // change refetches without collapsing the screen.
  const page = () => gated(data);
  const rows = (): BreachRow[] => page()?.nodes ?? [];
  const totalCount = () => page()?.totalCount ?? 0;

  clampPageOffset({
    total: () => settledTotal(data, page => page.totalCount),
    offset: () => props.state.breachOffset,
    pageSize: () => props.state.first,
    setOffset: offset =>
      props.setState({ ...props.state, breachOffset: offset }),
  });

  // S3's opening state — the row whose action was pressed. Mounted fresh per
  // open (<Show> below), so the comment field seeds empty each time.
  const [acknowledging, setAcknowledging] = createSignal<BreachRow | null>(
    null
  );

  const currentSort = (): SortState<SortKey> | undefined => {
    const s = props.state.breachSort[0];
    return s ? { key: s.key, desc: s.desc ?? false } : undefined;
  };
  const onSort = (key: SortKey, desc: boolean) =>
    props.setState({
      ...props.state,
      breachSort: [{ key, desc }],
      breachOffset: 0,
    });

  // Columns are an accessor: their text comes from t(), read in a reactive
  // scope so it re-translates on a language switch.
  const columns = (): Column<BreachRow, SortKey>[] => [
    {
      // Column 1, unlabelled: the acknowledge action, the comment, or nothing
      // (rules › acknowledging a breach). Structural — hiding it would remove
      // the row's only action — so it is kept out of the Columns popover.
      c: { id: 'status' },
      header: () => '',
      meta: {
        align: 'center',
        hideFromColumnSettings: true,
        textLabel: () => t('label.status'),
      },
      size: remToPx(3),
      cell: info => (
        <StatusActionCell
          breach={info.row.original}
          onAcknowledge={() => setAcknowledging(info.row.original)}
        />
      ),
    },
    {
      c: { accessor: row => t(statusLabelKey(row)), id: 'statusLabel' },
      header: () => t('label.status'),
      ...getTextCell(),
      size: remToPx(8),
    },
    {
      c: { accessor: row => row.sensor?.name ?? '', id: 'sensorName' },
      header: () => t('label.sensor-name'),
      ...getCellDefinition('name', { headerPosition: 'primary' }),
    },
    {
      // The location's CODE, as the filter matches it.
      c: { accessor: row => row.location?.code ?? '', id: 'location' },
      header: () => t('label.location'),
      ...getCellDefinition('location'),
    },
    {
      c: {
        accessor: row => localisedDateTime(row.startDatetime),
        id: 'startDatetime',
      },
      sortKey: BREACH_SORT_KEYS[0],
      header: () => t('label.type-start'),
      ...getTextCell(),
      size: remToPx(10),
    },
    {
      // Blank while the breach is ongoing — the fact the Duration column
      // then states in a word.
      c: {
        accessor: row =>
          row.endDatetime ? localisedDateTime(row.endDatetime) : '',
        id: 'endDatetime',
      },
      sortKey: BREACH_SORT_KEYS[1],
      header: () => t('label.type-end'),
      ...getTextCell(),
      size: remToPx(10),
    },
    {
      // Derived from start and end — never durationMilliseconds, which is 0
      // for an ongoing breach (contract ⚠️ wire trap) — or the word Ongoing.
      c: { id: 'duration' },
      header: () => t('label.duration'),
      ...getTextCell(),
      size: remToPx(7),
      cell: info => <DurationCell breach={info.row.original} />,
    },
    {
      c: { key: 'type' },
      header: () => t('label.type'),
      ...getTextCell(),
      size: remToPx(9),
      cell: info => <BreachTypeCell type={info.row.original.type} />,
    },
    {
      // Blank only where genuinely absent — a reading of 0 °C is shown (rules
      // › temperature display).
      c: {
        accessor: row =>
          hasTemperature(row.maxOrMinTemperature)
            ? formatTemperature(row.maxOrMinTemperature)
            : '',
        id: 'maxOrMinTemperature',
      },
      header: () => t('label.max-min-temperature'),
      ...getTextCell({
        align: 'right',
        description: t('description.max-min-temperature'),
      }),
      size: remToPx(6),
    },
  ];

  return (
    <>
      <DataTable
        columns={columns()}
        rows={rows()}
        rowKey={row => row.id}
        loading={data.loading}
        sort={currentSort()}
        onSort={onSort}
        emptyMessage={t('error.no-temperature-breaches')}
        config={tableConfig.config()}
        setConfig={tableConfig.setConfig}
        onSaveGlobalDefault={
          tableConfig.canSaveGlobalDefault()
            ? tableConfig.saveGlobalTableConfig
            : undefined
        }
        pagination={{
          offset: props.state.breachOffset,
          pageSize: props.state.first,
          total: totalCount(),
          onOffsetChange: offset =>
            props.setState({ ...props.state, breachOffset: offset }),
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
      <Show when={acknowledging()}>
        {breach => (
          <AcknowledgeBreachModal
            storeId={props.storeId}
            breach={breach()}
            onClose={() => setAcknowledging(null)}
            onAcknowledged={() => {
              // The row becomes Acknowledged and the band's count falls by
              // one (rules › acknowledging a breach) — both by direct re-read.
              void refetch();
              refetchNotifications();
            }}
          />
        )}
      </Show>
    </>
  );
};
