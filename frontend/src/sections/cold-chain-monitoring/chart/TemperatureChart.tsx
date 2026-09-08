import {
  createMemo,
  createSignal,
  For,
  onCleanup,
  onMount,
  Show,
  type JSX,
} from 'solid-js';
import { localisedDate, localisedDateTime, localisedTime, t } from '@/intl';
import { ChartLegend } from '@/ui/elements/charts/ChartLegend';
import { Popover } from '@/ui/elements/feedback/Popover';
import { AlertCircleIcon } from '@/ui/icons';
import { remToPx } from '@/ui/utils/rem';
import { formatTemperature } from '../monitoring/breachDisplay';
import {
  COLD_THRESHOLD,
  HOT_THRESHOLD,
  breachMarkers,
  lineSegments,
  readingsAt,
  temperatureDomain,
  temperatureTicks,
  timeTicks,
  type SensorSeries,
} from './chartData';
import styles from './TemperatureChart.module.css';

// T1's plot — the temperature-over-time chart (spec/cold-chain-monitoring
// ui-surface T1; rules › the chart): one dashed line per sensor with gaps
// where readings are missing, the two fixed threshold bands, a breach marker
// at the reading that begins each breach run, a hover tooltip naming the
// moment and every sensor's reading at it, and a legend.
//
// Hand-rolled SVG, no chart library (bundle discipline — the shared charts
// group's own approach). It lives in the section rather than src/ui/ because
// this vertical is its only consumer (README › known gaps); the registry
// carries its role. Colours come from the theme tokens through the module
// CSS; the geometry below is measured layout (px), the one place px is right.

/** The plot's fixed geometry: padding for the axes, height in rem. */
const PAD = { top: 12, right: 16, bottom: 28, left: 44 };
const HEIGHT_REM = 20;
/** How many distinct series looks the CSS provides; a seventh sensor cycles. */
const SERIES_STYLES = 6;

export interface TemperatureChartProps {
  series: SensorSeries[];
  /** The horizontal window, epoch ms. */
  window: { start: number; end: number };
  /** The S2 summary a marker opens — the popover's content, given the breach
   *  and its close(). */
  markerContent: (breachId: string, close: () => void) => JSX.Element;
}

export const TemperatureChart = (props: TemperatureChartProps) => {
  // The plot's width follows its container: measured, so the SVG draws at
  // real pixel size and its text stays legible rather than scaling with a
  // viewBox.
  let wrap!: HTMLDivElement;
  const [width, setWidth] = createSignal(0);
  onMount(() => {
    const observer = new ResizeObserver(entries => {
      const box = entries[0]?.contentRect;
      if (box) setWidth(box.width);
    });
    observer.observe(wrap);
    setWidth(wrap.clientWidth);
    onCleanup(() => observer.disconnect());
  });
  const height = () => remToPx(HEIGHT_REM);
  const plotWidth = () => Math.max(1, width() - PAD.left - PAD.right);
  const plotHeight = () => height() - PAD.top - PAD.bottom;

  const domain = createMemo(() => temperatureDomain(props.series));
  const x = (time: number) =>
    PAD.left +
    ((time - props.window.start) /
      Math.max(1, props.window.end - props.window.start)) *
      plotWidth();
  const y = (temperature: number) =>
    PAD.top +
    ((domain().max - temperature) / Math.max(1, domain().max - domain().min)) *
      plotHeight();

  const markers = createMemo(() => breachMarkers(props.series));
  const yTicks = createMemo(() => temperatureTicks(domain()));
  const xTicks = createMemo(() => timeTicks(props.window));
  // Times alone read fine across a day or two; a wider window needs dates.
  const xLabel = (time: number) =>
    props.window.end - props.window.start <= 2 * 24 * 60 * 60 * 1000
      ? localisedTime(time)
      : localisedDate(time);

  const linePath = (points: { time: number; temperature: number }[]) =>
    points
      .map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.time)} ${y(p.temperature)}`)
      .join(' ');

  // Hover: the moment nearest the pointer, within ten pixels' worth of time.
  const [hoverTime, setHoverTime] = createSignal<number>();
  const moment = createMemo(() => {
    const time = hoverTime();
    if (time === undefined) return undefined;
    const perPixel =
      (props.window.end - props.window.start) / Math.max(1, plotWidth());
    return readingsAt(props.series, time, Math.max(60_000, perPixel * 10));
  });
  const onMove = (event: MouseEvent) => {
    const rect = (event.currentTarget as SVGElement).getBoundingClientRect();
    const px = event.clientX - rect.left - PAD.left;
    setHoverTime(
      props.window.start +
        (px / Math.max(1, plotWidth())) *
          (props.window.end - props.window.start)
    );
  };

  const seriesIndex = (sensorId: string) =>
    Math.max(
      0,
      props.series.findIndex(s => s.sensorId === sensorId)
    ) % SERIES_STYLES;

  return (
    <div class={styles.block}>
      <div class={styles.wrap} ref={wrap} data-testid="temperature-chart">
        <Show when={width() > 0}>
          <svg
            class={styles.chart}
            width={width()}
            height={height()}
            role="img"
            aria-label={t('heading.chart')}
            onMouseMove={onMove}
            onMouseLeave={() => setHoverTime(undefined)}
          >
            {/* The two threshold bands — fixed presentation constants, the
                ordinary vaccine range, not the store's breach thresholds: a
                hot band above 8° and a cold band below 2°. */}
            <rect
              class={styles.hotBand}
              x={PAD.left}
              y={PAD.top}
              width={plotWidth()}
              height={Math.max(0, y(HOT_THRESHOLD) - PAD.top)}
            />
            <rect
              class={styles.coldBand}
              x={PAD.left}
              y={y(COLD_THRESHOLD)}
              width={plotWidth()}
              height={Math.max(0, PAD.top + plotHeight() - y(COLD_THRESHOLD))}
            />

            {/* Vertical axis: grid + labels, the two thresholds emphasised. */}
            <For each={yTicks()}>
              {tick => {
                const threshold =
                  tick === HOT_THRESHOLD || tick === COLD_THRESHOLD;
                return (
                  <>
                    <line
                      class={threshold ? styles.thresholdLine : styles.grid}
                      x1={PAD.left}
                      x2={PAD.left + plotWidth()}
                      y1={y(tick)}
                      y2={y(tick)}
                    />
                    <text
                      class={
                        threshold ? styles.thresholdLabel : styles.axisLabel
                      }
                      x={PAD.left - 6}
                      y={y(tick)}
                      text-anchor="end"
                      dominant-baseline="middle"
                    >
                      {formatTemperature(tick)}
                    </text>
                  </>
                );
              }}
            </For>

            {/* Horizontal axis: time across the window. */}
            <For each={xTicks()}>
              {tick => (
                <text
                  class={styles.axisLabel}
                  x={x(tick)}
                  y={PAD.top + plotHeight() + 18}
                  text-anchor="middle"
                >
                  {xLabel(tick)}
                </text>
              )}
            </For>

            {/* One dashed line per sensor, broken where readings are missing.
                The dash pattern varies with the colour, so two series are
                never told apart by colour alone. */}
            <For each={props.series}>
              {(s, i) => (
                <For each={lineSegments(s.points)}>
                  {segment => (
                    <Show
                      when={segment.length > 1}
                      fallback={
                        <circle
                          class={styles.line}
                          data-series={i() % SERIES_STYLES}
                          cx={x(segment[0]!.time)}
                          cy={y(segment[0]!.temperature)}
                          r={2}
                        />
                      }
                    >
                      <path
                        class={styles.line}
                        data-series={i() % SERIES_STYLES}
                        d={linePath(segment)}
                      />
                    </Show>
                  )}
                </For>
              )}
            </For>

            {/* Hover cursor at the identified moment. */}
            <Show when={moment()}>
              {m => (
                <line
                  class={styles.cursor}
                  x1={x(m().time)}
                  x2={x(m().time)}
                  y1={PAD.top}
                  y2={PAD.top + plotHeight()}
                />
              )}
            </Show>
          </svg>

          {/* Breach markers: an alert glyph in the error tone at the reading
              that begins each run, in place of its point (`.6`). HTML buttons
              positioned over the plot, so each is a real control with a name
              and the popover anchors to it (`.7`). */}
          <For each={markers()}>
            {marker => (
              <span
                class={styles.markerSlot}
                style={{
                  left: `${x(marker.time)}px`,
                  top: `${y(marker.temperature)}px`,
                }}
              >
                <Popover
                  placement="top"
                  trigger={<AlertCircleIcon />}
                  triggerLabel={`${marker.sensorName} ${t('heading.breach')}`}
                  triggerClass={styles.marker}
                  triggerTestId="breach-marker"
                >
                  {close => props.markerContent(marker.breachId, close)}
                </Popover>
              </span>
            )}
          </For>

          {/* The tooltip: the moment in bold, then one row per sensor — its
              name in the sensor's own colour, and its temperature (`.2`–`.5`). */}
          <Show when={moment()}>
            {m => (
              <div
                class={styles.tooltip}
                style={{ left: `${x(m().time)}px`, top: `${PAD.top}px` }}
                role="status"
              >
                <div class={styles.tooltipHead}>
                  {localisedDateTime(m().time)}
                </div>
                <For each={m().readings}>
                  {reading => (
                    <div>
                      <span
                        class={styles.tooltipName}
                        data-series={seriesIndex(reading.sensorId)}
                      >
                        {reading.name}
                      </span>{' '}
                      {formatTemperature(reading.temperature)}
                    </div>
                  )}
                </For>
              </div>
            )}
          </Show>
        </Show>
      </div>
      <ChartLegend
        items={props.series.map((s, i) => ({
          class:
            styles[`swatch${i % SERIES_STYLES}` as keyof typeof styles] ?? '',
          label: s.name,
          line: true,
        }))}
      />
    </div>
  );
};
