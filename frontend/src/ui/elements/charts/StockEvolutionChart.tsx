import { createMemo, For, Show } from 'solid-js';
import { format } from 'date-fns';
import { t } from '../../../intl';
import { formatNumber } from '../../../intl/formatNumber';
import { SvgPlot, linePath } from './svgPlot';

const fmt = (n: number) => formatNumber(n, { maximumFractionDigits: 2 });
import { ChartLegend } from './ChartLegend';
import styles from './plotChart.module.css';

/** One point of stock evolution. Structurally matches the wire
 *  `StockEvolutionNode`, so a vertical can pass those nodes directly. */
export type StockEvolutionPoint = {
  date: string;
  stockOnHand: number;
  minimumStockOnHand: number;
  maximumStockOnHand: number;
  isHistoric: boolean;
  isProjected: boolean;
};

/** Stock-on-hand bars (past vs projected) with dashed min / max threshold
 *  lines. Hand-rolled SVG — no chart library. */
export const StockEvolutionChart = (props: {
  data: StockEvolutionPoint[];
  width?: number;
  height?: number;
}) => {
  const data = createMemo(() => props.data);
  const maxValue = createMemo(() =>
    Math.max(
      1,
      ...data().map(d => Math.max(d.stockOnHand, d.maximumStockOnHand))
    )
  );

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
          xLabel={i => format(new Date(data()[i].date), 'd/M')}
          tooltip={i => (
            <>
              <div class={styles.tooltipHead}>
                {format(new Date(data()[i].date), 'd MMM')}
              </div>
              <div>
                {t('label.stock-level')}: {fmt(data()[i].stockOnHand)}
              </div>
              <div>
                {t('label.min')} {fmt(data()[i].minimumStockOnHand)} ·{' '}
                {t('label.max')} {fmt(data()[i].maximumStockOnHand)}
              </div>
            </>
          )}
        >
          {s => (
            <>
              <For each={data()}>
                {(d, i) => (
                  <rect
                    class={d.isHistoric ? styles.past : styles.projected}
                    x={s.bandLeft(i())}
                    width={s.bandWidth}
                    y={s.y(d.stockOnHand)}
                    height={s.y(0) - s.y(d.stockOnHand)}
                  />
                )}
              </For>
              <path
                class={styles.maxLine}
                d={linePath(
                  data().map((d, i) => [s.bandCenter(i), s.y(d.maximumStockOnHand)])
                )}
              />
              <path
                class={styles.minLine}
                d={linePath(
                  data().map((d, i) => [s.bandCenter(i), s.y(d.minimumStockOnHand)])
                )}
              />
            </>
          )}
        </SvgPlot>
        <ChartLegend
          items={[
            { class: styles.swatchPast, label: t('label.past') },
            { class: styles.swatchProjected, label: t('label.projected') },
            { class: styles.swatchMax, label: t('label.max'), line: true },
            { class: styles.swatchMin, label: t('label.min'), line: true },
          ]}
        />
      </div>
    </Show>
  );
};
