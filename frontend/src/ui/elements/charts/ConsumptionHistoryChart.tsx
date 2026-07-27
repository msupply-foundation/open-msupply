import { createMemo, For, Show } from 'solid-js';
import { format } from 'date-fns';
import { t } from '../../../intl';
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
    <Show
      when={data().length}
      fallback={<p class={styles.empty}>{t('error.no-data')}</p>}
    >
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
              <div>
                {t('label.consumption')}: {data()[i].consumption}
              </div>
              <div>
                {t('label.moving-average')}:{' '}
                {data()[i].averageMonthlyConsumption}
              </div>
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
            { class: styles.swatchHistoric, label: t('label.consumption') },
            { class: styles.swatchCurrent, label: t('label.current') },
            { class: styles.swatchProjected, label: t('label.projected') },
            {
              class: styles.swatchMovingAvg,
              label: t('label.moving-average'),
              line: true,
            },
          ]}
        />
      </div>
    </Show>
  );
};
