import { createMemo, createResource, Show } from 'solid-js';
import type { Component } from 'solid-js';
import { graphqlFetch } from '@/api/graphql';
import { gated } from '@/api/gated';
import { t } from '@/intl';
import { ContentContainer } from '@/ui/layout/ContentContainer/ContentContainer';
import { Stack } from '@/ui/layout/Stack/Stack';
import { Text } from '@/ui/elements/typography/Text';
import { Alert } from '@/ui/elements/feedback/Alert';
import { Spinner } from '@/ui/elements/feedback/Spinner';
import { FilterBar } from '@/ui/elements/selectors/FilterBar';
import { TemperatureLogs } from '../monitoring.generated';
import type { TemperatureLogsVariables } from '../monitoring.generated';
import {
  buildChartVariables,
  chartWindow,
  type ListedBreach,
  type MonitoringFilter,
} from '../monitoring/monitoringState';
import { filterFields } from '../monitoring/monitoringFilters';
import { buildSeries, isTruncated, timeExtent } from './chartData';
import { TemperatureChart } from './TemperatureChart';
import { BreachSummary } from './BreachSummary';

// T1 — the Chart tab (spec/cold-chain-monitoring ui-surface T1): the shared
// filter bar, then the plot titled "Temperature by sensor", its truncation
// notice and its loading spinner. A window with no reading draws a BLANK
// chart — axes and bands with nothing plotted, an empty legend — never a
// placeholder in the chart's place (rules › the chart). Reads the log
// connector over the chart's window at the data-point cap; the per-sensor
// series and the breach markers are shaped by chart/chartData.
//
// The filter bar stands above the plot because this tab has no table toolbar
// to host it (ui-standards › tables › toolbar puts a bar with its table); the
// two table tabs carry the same bar in theirs, over the same URL-backed state.

export interface ChartTabProps {
  storeId: string;
  filter: MonitoringFilter;
  /** The screen's one filter edit — every tab's bar writes through it. */
  onFilterChange: (filter: MonitoringFilter) => void;
  /** Bumped by the screen when something outside the filters changed the
   *  record (a fridge-sensor import), so the plot re-reads in place. */
  refreshVersion: number;
  /** A marker's "View all breaches" — the Breaches tab, sorted by start,
   *  with the shared filters widened so the selected breach is listed. */
  onViewAllBreaches: (breach: ListedBreach) => void;
}

export const ChartTab: Component<ChartTabProps> = props => {
  // "Now" is fixed per filter change so a start-only range's axis end does
  // not drift on every re-render.
  const now = createMemo(() => {
    void props.filter;
    void props.refreshVersion;
    return new Date();
  });
  const variables = createMemo<TemperatureLogsVariables>(() =>
    buildChartVariables(props.filter, props.storeId)
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
  // The axis window (rules › the chart): the chip's bounds where given, the
  // plotted readings' extent for an open side — so an end alone runs back to
  // the first reading, and no bounds at all span whatever came back.
  const window = () => chartWindow(props.filter, now(), timeExtent(series()));

  return (
    // `padded` supplies the body's edge padding the screen's fillBody Page
    // strips (the table tabs are full-bleed); the wide measure keeps a
    // 20rem-tall plot from stretching edge to edge on a wide monitor; `start`
    // hugs the reading edge so the bar sits where the tables' toolbars put it.
    <ContentContainer size="wide" padded align="start">
      <Stack gap="md">
        <FilterBar
          filters={filterFields()}
          filter={props.filter}
          onChange={props.onFilterChange}
        />
        <Text variant="heading" level={2}>
          {t('heading.chart')}
        </Text>
        <Show when={truncated()}>
          {/* The window holds more readings than were requested: what is
              plotted is incomplete, and the chart MUST say so (rules › the
              chart). A warning notice (ui-surface T1). */}
          <Alert severity="warning" testId="chart-truncated">
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
      </Stack>
    </ContentContainer>
  );
};
