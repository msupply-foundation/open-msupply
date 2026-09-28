import { createMemo, createSignal, For, onCleanup, Show } from 'solid-js';
import { t } from '../../../intl';
import { formatNumber } from '../../../intl/formatNumber';
import { remToPx } from '../../utils/rem';
import styles from './TargetQuantityBreakdown.module.css';

const round = (n: number) => Math.round(n);
// The original's gate: an axis this share of the row (%) or narrower shows its
// numbers alone.
const MIN_AXIS_WIDTH_FOR_TEXT = 5;
// Narrower than this, a month cell can't hold its month count or a marker
// label without breaking words, so the axis shows its numbers alone.
const MIN_CELL_REM_FOR_TEXT = 3.75;
// How far the chart may narrow before showing text hides again: at least a
// classic (space-taking) scrollbar's width. See monthAxisFitsText.
const TEXT_KEEP_REM = 1.25;
// A value bar this share of the target (%) or narrower is too thin for its
// number / label to show inside or beneath it.
const MIN_BAR_WIDTH_FOR_VALUE = 5;
const MIN_BAR_WIDTH_FOR_LABEL = 10;
// Displayed values to 2 decimal places (the layout maths below keep round()).
const fmt = (n: number) => formatNumber(n, { maximumFractionDigits: 2 });

/** Whether the month axis has room for text: the month counts, the "0" and the
 *  threshold / target markers. The original gates on the axis alone (wider
 *  than 5% of the row), but with many months that still leaves cells too
 *  narrow: their text broke mid-word and pushed the number out of view. So
 *  each cell (the axis's share of the chart, split evenly across its months)
 *  must also be at least `minCellPx` wide. Until the chart is measured
 *  (`chartPx` undefined), only the original's gate applies.
 *
 *  While text is showing, pass `keepPx`: the chart may be that much narrower
 *  before the text hides again. Showing text makes the cells taller, which can
 *  bring in a classic scrollbar on the dialog and narrow the chart; without
 *  the margin, the two would switch each other back and forth. */
export const monthAxisFitsText = (
  axisPercent: number,
  months: number,
  chartPx: number | undefined,
  minCellPx: number,
  keepPx = 0
): boolean => {
  if (axisPercent <= MIN_AXIS_WIDTH_FOR_TEXT) return false;
  if (chartPx === undefined) return true;
  const cellPx = ((chartPx + keepPx) * axisPercent) / 100 / Math.max(months, 1);
  return cellPx >= minCellPx;
};

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
        {/* Text too big for a thin bar stays for screen readers. */}
        <div class={`${styles.valueFill} ${props.fillClass}`}>
          <span
            class={
              flex() > MIN_BAR_WIDTH_FOR_VALUE ? styles.valueNum : styles.srOnly
            }
          >
            {fmt(props.value)}
          </span>
        </div>
        <div
          class={
            flex() > MIN_BAR_WIDTH_FOR_LABEL ? styles.valueLabel : styles.srOnly
          }
        >
          {props.label}
        </div>
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
  // A memo: every cell reads it, and the chart width changes on each resize.
  // It also remembers whether text is showing, for monthAxisFitsText's margin.
  const showText = createMemo<boolean>(
    showing =>
      monthAxisFitsText(
        targetWidth(),
        months().length,
        chartWidth(),
        remToPx(MIN_CELL_REM_FOR_TEXT),
        showing ? remToPx(TEXT_KEEP_REM) : 0
      ),
    false
  );
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
                {/* Text the cell has no room for stays for screen readers. */}
                <Show when={marker(m)}>
                  {label => (
                    <div
                      class={
                        showText() ? styles.monthAdditional : styles.srOnly
                      }
                    >
                      {label()}
                    </div>
                  )}
                </Show>
                <div class={styles.monthValue}>
                  <span class={styles.monthNumber}>{fmt(monthValue(m))}</span>
                  <Show
                    when={showText()}
                    fallback={
                      <span class={styles.srOnly}>{monthCount(m)}</span>
                    }
                  >
                    {monthCount(m)}
                  </Show>
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
