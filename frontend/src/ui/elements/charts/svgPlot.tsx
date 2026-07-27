import { createMemo, createSignal, For, Show, type JSX } from 'solid-js';
import { formatNumber } from '../../../intl/formatNumber';
import styles from './plotChart.module.css';

// Axis tick labels: grouped, ≤ 2 dp — never the raw float (niceTicks' step
// arithmetic can yield 0.6000000000000001).
const axisLabel = (value: number): string =>
  formatNumber(value, { maximumFractionDigits: 2 });

/** Scales handed to a plot's mark-drawing children. */
export type PlotScales = {
  /** Left edge (px) of band i. */
  bandLeft: (i: number) => number;
  /** Band width (px). */
  bandWidth: number;
  /** Centre (px) of band i. */
  bandCenter: (i: number) => number;
  /** Pixel y for a value (baseline = y(0)). */
  y: (value: number) => number;
};

const PAD = { top: 12, right: 12, bottom: 26, left: 34 };
const BAND_PADDING = 0.2; // gap between bars, as a fraction of the band step

/** Build an SVG path `d` from [x, y] points; a non-finite point breaks the
 *  line into a new segment. */
export const linePath = (points: [number, number][]): string => {
  let d = '';
  let penDown = false;
  for (const [x, y] of points) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      penDown = false;
      continue;
    }
    d += `${penDown ? 'L' : 'M'}${x} ${y} `;
    penDown = true;
  }
  return d.trim();
};

/** Round axis ticks: a "nice" step (1 / 2 / 5 × 10ⁿ) covering [0, max], and
 *  the rounded-up max the step lands on (used as the y domain top). */
const niceTicks = (max: number, count: number) => {
  const rawStep = (max || 1) / count;
  const mag = 10 ** Math.floor(Math.log10(rawStep));
  const norm = rawStep / mag;
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * mag;
  const niceMax = Math.ceil((max || 1) / step) * step;
  const ticks: number[] = [];
  for (let t = 0; t <= niceMax + step / 1000; t += step) ticks.push(t);
  return { ticks, niceMax };
};

/**
 * The shared SVG plot frame: computes a band x-scale + linear y-scale from the
 * data (both hand-rolled — a few lines of arithmetic, no chart or maths
 * library), draws the y grid + axis labels and a per-band hover layer with a
 * cursor + tooltip, and hands the scales to `children` to draw the marks. Owns
 * no colour — every part is a token-styled class.
 */
export const SvgPlot = (props: {
  count: number;
  maxValue: number;
  width?: number;
  height?: number;
  xLabel: (i: number) => string;
  tooltip: (i: number) => JSX.Element;
  children: (scales: PlotScales) => JSX.Element;
}) => {
  const w = () => props.width ?? 460;
  const h = () => props.height ?? 250;
  const right = () => w() - PAD.right;
  const bottom = () => h() - PAD.bottom;

  const axis = createMemo(() => niceTicks(props.maxValue, 5));

  const scales = createMemo<PlotScales>(() => {
    const stepPx = (right() - PAD.left) / Math.max(props.count, 1);
    const bandWidth = stepPx * (1 - BAND_PADDING);
    const inset = (stepPx - bandWidth) / 2;
    const top = PAD.top;
    const base = bottom();
    const domainTop = axis().niceMax || 1;
    return {
      bandLeft: i => PAD.left + i * stepPx + inset,
      bandWidth,
      bandCenter: i => PAD.left + i * stepPx + inset + bandWidth / 2,
      y: v => base - (v / domainTop) * (base - top),
    };
  });

  const indices = createMemo(() =>
    Array.from({ length: props.count }, (_, i) => i)
  );
  const [active, setActive] = createSignal<number>();

  return (
    <div class={styles.plotWrap}>
      <svg
        class={styles.chart}
        width={w()}
        height={h()}
        viewBox={`0 0 ${w()} ${h()}`}
        role="img"
      >
        {/* y grid + labels */}
        <For each={axis().ticks}>
          {tick => (
            <>
              <line
                class={styles.grid}
                x1={PAD.left}
                x2={right()}
                y1={scales().y(tick)}
                y2={scales().y(tick)}
              />
              <text
                class={styles.axisLabel}
                x={PAD.left - 6}
                y={scales().y(tick)}
                text-anchor="end"
                dominant-baseline="middle"
              >
                {axisLabel(tick)}
              </text>
            </>
          )}
        </For>

        {/* x labels */}
        <For each={indices()}>
          {i => (
            <text
              class={styles.axisLabel}
              x={scales().bandCenter(i)}
              y={bottom() + 16}
              text-anchor="middle"
            >
              {props.xLabel(i)}
            </text>
          )}
        </For>

        {/* the marks (bars / lines) */}
        {props.children(scales())}

        {/* hover cursor */}
        <Show when={active() !== undefined}>
          <line
            class={styles.cursor}
            x1={scales().bandCenter(active()!)}
            x2={scales().bandCenter(active()!)}
            y1={PAD.top}
            y2={bottom()}
          />
        </Show>

        {/* per-band hover hit targets (on top so they capture the pointer) */}
        <For each={indices()}>
          {i => (
            <rect
              class={styles.hover}
              x={scales().bandLeft(i)}
              y={PAD.top}
              width={scales().bandWidth}
              height={bottom() - PAD.top}
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(undefined)}
            />
          )}
        </For>
      </svg>

      <Show when={active() !== undefined}>
        <div
          class={styles.tooltip}
          style={{
            left: `${scales().bandCenter(active()!)}px`,
            top: `${PAD.top}px`,
          }}
        >
          {props.tooltip(active()!)}
        </div>
      </Show>
    </div>
  );
};
