import { createMemo, For, Show } from 'solid-js';
import { format } from 'date-fns';
import { SvgPlot, linePath } from './svgPlot';
import { ChartLegend } from './ChartLegend';
import styles from './plotChart.module.css';

/** One month of consumption history. Structurally matches the wire
 *  `ConsumptionHistoryNode`, so a vertical can pass those nodes directly. */
export type ConsumptionHistoryPoint = {
  date: string;
  consumption: number;
  averageMonthlyConsumption: number;
  isHistoric: boolean;
  isCurrent: boolean;
};

/** Monthly consumption bars (coloured historic / current / projected) with a
 *  moving-average line overlaid. Hand-rolled SVG — no chart library. */
export const ConsumptionHistoryChart = (props: {
  data: ConsumptionHistoryPoint[];
  width?: number;
  height?: number;
}) => {
  const data = createMemo(() => props.data);
  const maxValue = createMemo(() =>
    Math.max(1, ...data().map(d => d.consumption))
  );
  const barClass = (d: ConsumptionHistoryPoint) =>
    d.isHistoric ? styles.historic : d.isCurrent ? styles.current : styles.projected;

  return (
    <Show when={data().length} fallback={<p class={styles.empty}>No data</p>}>
      <div class={styles.chartBlock}>
        <SvgPlot
          count={data().length}
          maxValue={maxValue()}
          width={props.width}
          height={props.height}
          xLabel={i => format(new Date(data()[i].date), 'MMM')}
          tooltip={i => (
            <>
              <div class={styles.tooltipHead}>
                {format(new Date(data()[i].date), 'MMM yyyy')}
              </div>
              <div>Consumption: {data()[i].consumption}</div>
              <div>Moving average: {data()[i].averageMonthlyConsumption}</div>
            </>
          )}
        >
          {s => (
            <>
              <For each={data()}>
                {(d, i) => (
                  <rect
                    class={barClass(d)}
                    x={s.bandLeft(i())}
                    width={s.bandWidth}
                    y={s.y(d.consumption)}
                    height={s.y(0) - s.y(d.consumption)}
                  />
                )}
              </For>
              <path
                class={styles.movingAvg}
                d={linePath(
                  data().map((d, i) => [
                    s.bandCenter(i),
                    s.y(d.averageMonthlyConsumption),
                  ])
                )}
              />
            </>
          )}
        </SvgPlot>
        <ChartLegend
          items={[
            { class: styles.swatchHistoric, label: 'Consumption' },
            { class: styles.swatchCurrent, label: 'Current' },
            { class: styles.swatchProjected, label: 'Projected' },
            {
              class: styles.swatchMovingAvg,
              label: 'Moving average',
              line: true,
            },
          ]}
        />
      </div>
    </Show>
  );
};
