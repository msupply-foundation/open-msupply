import { For, Show } from 'solid-js';
import styles from './TargetQuantityBreakdown.module.css';

const round = (n: number) => Math.round(n);

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
        title={`${props.label}: ${round(props.value)}`}
      >
        <div class={`${styles.valueFill} ${props.fillClass}`}>
          <Show when={flex() > 5}>
            <span class={styles.valueNum}>{round(props.value)}</span>
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
  const showText = () => targetWidth() > 5;
  const months = () =>
    Array.from({ length: props.targetMonths }, (_, i) => i + 1);
  const monthValue = (m: number) => round(amc() * m);
  const monthText = (m: number) =>
    `${monthValue(m)}${showText() ? ` (${m} ${m === 1 ? 'month' : 'months'})` : ''}`;
  const additional = (m: number) =>
    m === props.targetMonths
      ? 'Target MOS'
      : m === props.thresholdMonths
        ? 'Reorder threshold'
        : undefined;
  return (
    <Show
      when={canCalculate()}
      fallback={
        <p class={styles.calcError} role="status">
          Unable to calculate: No Average Monthly Consumption value
        </p>
      }
    >
      <div class={styles.stockDist}>
        <div class={styles.monthAxis} style={{ width: `${targetWidth()}%` }}>
          <div class={styles.monthEdge}>
            <Show when={showText()}>
              <span class={styles.monthEdgeLabel}>0</span>
            </Show>
          </div>
          <For each={months()}>
            {m => (
              <div class={styles.monthCell} title={monthText(m)}>
                <Show when={additional(m)}>
                  {label => <div class={styles.monthAdditional}>{label()}</div>}
                </Show>
                <div class={styles.monthValue}>{monthText(m)}</div>
              </div>
            )}
          </For>
        </div>
        <div class={styles.valueBars} style={{ width: barWidth() }}>
          <ValueBar
            value={soh()}
            total={target()}
            label="Stock on hand"
            fillClass={styles.sohFill}
            startDivider
          />
          <ValueBar
            value={suggested()}
            total={target()}
            label="Suggested order quantity"
            fillClass={styles.suggestedFill}
          />
        </div>
      </div>
    </Show>
  );
};
