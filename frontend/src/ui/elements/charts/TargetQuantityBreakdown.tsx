import { createSignal, For, onCleanup, Show } from 'solid-js';
import { t } from '../../../intl';
import { formatNumber } from '../../../intl/formatNumber';
import { remToPx } from '../../utils/rem';
import styles from './TargetQuantityBreakdown.module.css';

const round = (n: number) => Math.round(n);
// Narrower than this, a month cell can't hold its month count or a marker
// label without breaking words, so the axis shows its numbers alone.
const MIN_CELL_REM_FOR_TEXT = 3.75;
// Displayed values to 2 decimal places (the layout maths below keep round()).
const fmt = (n: number) => formatNumber(n, { maximumFractionDigits: 2 });

// One horizontal value bar (stock on hand / suggested order). A zero-value bar
// collapses to just its start divider — mirrors the app's original ValueBar.
const ValueBar = (props: {
  value: number;
  total: number;
  label: string;
  fillClass: string;
  startDivider?: boolean;
}) => {
  const flex = () => Math.min(round((100 * props.value) / props.total), 100);
  return (
    <Show
      when={props.value !== 0}
      fallback={props.startDivider ? <div class={styles.divider} /> : null}
    >
      <Show when={props.startDivider}>
        <div class={styles.divider} />
      </Show>
      <div
        class={styles.valueBar}
        style={{ 'flex-basis': `${flex()}%`, 'flex-grow': 1 }}
        title={`${props.label}: ${fmt(props.value)}`}
      >
        <div class={`${styles.valueFill} ${props.fillClass}`}>
          <Show when={flex() > 5}>
            <span class={styles.valueNum}>{fmt(props.value)}</span>
          </Show>
        </div>
        <Show when={flex() > 10}>
          <div class={styles.valueLabel}>{props.label}</div>
        </Show>
      </div>
      <div class={styles.divider} />
    </Show>
  );
};

/** The target-quantity breakdown — a faithful port of the app's original
 *  `StockDistribution`. A month-marker axis (0 → target months, each cell a
 *  month of AMC, with the reorder threshold and target MOS called out) sits
 *  above horizontal value bars for stock on hand + suggested order,
 *  proportioned to the target quantity; when stock exceeds the target the axis
 *  shrinks and the stock bar fills the row. Hand-rolled — the original
 *  composes it from value bars, not a plotting chart. With no average monthly
 *  consumption it cannot calculate. */
export const TargetQuantityBreakdown = (props: {
  averageMonthlyConsumption: number;
  availableStockOnHand: number;
  suggestedQuantity: number;
  /** Reorder-threshold months (min). */
  thresholdMonths: number;
  /** Target months (max). */
  targetMonths: number;
}) => {
  const amc = () => props.averageMonthlyConsumption;
  const soh = () => props.availableStockOnHand;
  const suggested = () => props.suggestedQuantity;
  const target = () => props.targetMonths * amc();
  const canCalculate = () => amc() > 0 && !(suggested() === 0 && soh() === 0);
  const targetWidth = () =>
    soh() > target() ? round((100 * target()) / soh()) : 100;
  const barWidth = () =>
    soh() + suggested() < target()
      ? `${round((100 * (soh() + suggested())) / target())}%`
      : '100%';
  const months = () =>
    Array.from({ length: props.targetMonths }, (_, i) => i + 1);
  // The chart's rendered width, so the text gate below can size a cell.
  const [chartWidth, setChartWidth] = createSignal<number>();
  const measure = (el: HTMLDivElement) => {
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setChartWidth(entry.contentRect.width);
    });
    observer.observe(el);
    onCleanup(() => observer.disconnect());
  };
  // The month counts, the "0" and the threshold / target markers show only
  // when each cell has room for them. The original gates on the axis alone
  // (wider than 5% of the row), but with many months that still leaves cells
  // too narrow: their text broke mid-word and pushed the number out of view.
  // Until the chart is measured, only the original's gate applies.
  const showText = () => {
    if (targetWidth() <= 5) return false;
    const width = chartWidth();
    if (width === undefined) return true;
    const cellWidth =
      (width * targetWidth()) / 100 / Math.max(months().length, 1);
    return cellWidth >= remToPx(MIN_CELL_REM_FOR_TEXT);
  };
  const monthValue = (m: number) => amc() * m;
  const monthCount = (m: number) =>
    ` (${m} ${m === 1 ? t('label.month') : t('label.months')})`;
  const marker = (m: number) =>
    m === props.targetMonths
      ? t('label.max-months-of-stock')
      : m === props.thresholdMonths
        ? t('label.min-months-of-stock')
        : undefined;
  // The tooltip always carries a cell's full text, whatever the cell shows.
  const monthTitle = (m: number) => {
    const label = marker(m);
    const text = `${fmt(monthValue(m))}${monthCount(m)}`;
    return label ? `${label}: ${text}` : text;
  };
  return (
    <Show
      when={canCalculate()}
      fallback={
        <p class={styles.calcError} role="status">
          {t('error.unable-to-calculate')}:{' '}
          {amc() <= 0
            ? t('error.amc-is-zero')
            : t('error.soh-and-suggested-quantity-are-zero')}
        </p>
      }
    >
      <div class={styles.stockDist} ref={measure}>
        <div
          class={styles.monthAxis}
          classList={{ [styles.numbersOnly ?? '']: !showText() }}
          style={{ width: `${targetWidth()}%` }}
        >
          <div class={styles.monthEdge}>
            <Show when={showText()}>
              <span class={styles.monthEdgeLabel}>0</span>
            </Show>
          </div>
          <For each={months()}>
            {m => (
              <div class={styles.monthCell} title={monthTitle(m)}>
                <Show when={showText() && marker(m)}>
                  {label => <div class={styles.monthAdditional}>{label()}</div>}
                </Show>
                <div class={styles.monthValue}>
                  <span class={styles.monthNumber}>{fmt(monthValue(m))}</span>
                  {showText() ? monthCount(m) : ''}
                </div>
              </div>
            )}
          </For>
        </div>
        <div class={styles.valueBars} style={{ width: barWidth() }}>
          <ValueBar
            value={soh()}
            total={target()}
            label={t('label.stock-on-hand')}
            fillClass={styles.sohFill}
            startDivider
          />
          <ValueBar
            value={suggested()}
            total={target()}
            label={t('label.suggested-order-quantity')}
            fillClass={styles.suggestedFill}
          />
        </div>
      </div>
    </Show>
  );
};
