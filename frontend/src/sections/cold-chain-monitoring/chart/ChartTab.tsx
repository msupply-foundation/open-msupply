import { createMemo, createResource, Show } from 'solid-js';
import type { Component } from 'solid-js';
import { graphqlFetch } from '@/api/graphql';
import { gated } from '@/api/gated';
import { t } from '@/intl';
import { Stack } from '@/ui/layout/Stack/Stack';
import { Text } from '@/ui/elements/typography/Text';
import { Alert } from '@/ui/elements/feedback/Alert';
import { EmptyState } from '@/ui/elements/feedback/EmptyState';
import { Spinner } from '@/ui/elements/feedback/Spinner';
import { TemperatureLogs } from '../monitoring.generated';
import type { TemperatureLogsVariables } from '../monitoring.generated';
import {
  buildChartVariables,
  chartWindow,
  type ListedBreach,
  type MonitoringFilter,
} from '../monitoring/monitoringState';
import { buildSeries, isTruncated, timeExtent } from './chartData';
import { TemperatureChart } from './TemperatureChart';
import { BreachSummary } from './BreachSummary';

// T1 — the Chart tab (spec/cold-chain-monitoring ui-surface T1): the plot
// titled "Temperature by sensor", its truncation notice, its empty state and
// its loading spinner. Reads the log connector over the chart's window at the
// data-point cap; the per-sensor series and the breach markers are shaped by
// chart/chartData.

export interface ChartTabProps {
  storeId: string;
  filter: MonitoringFilter;
  /** Bumped by the screen when something outside the filters changed the
   *  record (a fridge-sensor import), so the plot re-reads in place. */
  refreshVersion: number;
  /** A marker's "View all breaches" — the Breaches tab, sorted by start,
   *  with the shared filters widened so the selected breach is listed. */
  onViewAllBreaches: (breach: ListedBreach) => void;
}

export const ChartTab: Component<ChartTabProps> = props => {
  // "Now" is fixed per filter change so the default window does not drift
  // between the query and the axis on every re-render.
  const now = createMemo(() => {
    void props.filter;
    void props.refreshVersion;
    return new Date();
  });
  const variables = createMemo<TemperatureLogsVariables>(() =>
    buildChartVariables(props.filter, props.storeId, now())
  );

  // The resource SOURCE is the serialised variables plus the refresh version,
  // so an unchanged filter never refetches and an import always does.
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
  // Read through the gate: this tab sits under the open screen's boundary, and
  // a filter edit refetches while a chip has focus.
  const connector = () => gated(data);
  const series = createMemo(() => buildSeries(connector()?.nodes ?? []));
  const truncated = () => {
    const c = connector();
    return c ? isTruncated(c.totalCount, c.nodes.length) : false;
  };
  // The axis window: the filter's, or — with no bounds at all — the readings'
  // own extent, or an empty day ending now.
  const window = () =>
    chartWindow(props.filter, now()) ??
    timeExtent(series()) ?? {
      start: now().getTime() - 24 * 60 * 60 * 1000,
      end: now().getTime(),
    };

  return (
    <Stack gap="md">
      <Text variant="heading" level={2}>
        {t('heading.chart')}
      </Text>
      <Show when={truncated()}>
        {/* The window holds more readings than were requested: what is
            plotted is incomplete, and the chart MUST say so (rules › the
            chart). A warning in the error tone (ui-surface T1). */}
        <Alert severity="error" testId="chart-truncated">
          {t('error.too-many-datapoints')}
        </Alert>
      </Show>
      <Show
        when={connector()}
        fallback={
          <Show when={data.loading} fallback={null}>
            <Spinner center />
          </Show>
        }
      >
        <Show
          when={series().length > 0}
          fallback={
            <EmptyState
              message={t('error.no-temperature-logs')}
              data-testid="nothing-here"
            />
          }
        >
          <TemperatureChart
            series={series()}
            window={window()}
            markerContent={(breachId, close) => (
              <BreachSummary
                storeId={props.storeId}
                breachId={breachId}
                close={close}
                onViewAllBreaches={props.onViewAllBreaches}
              />
            )}
          />
        </Show>
      </Show>
    </Stack>
  );
};
