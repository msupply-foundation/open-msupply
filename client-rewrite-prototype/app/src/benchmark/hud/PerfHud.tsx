import { useMetrics, useMetricsState } from '@/benchmark/metrics/metricsContext';
import { useDraggable } from '@/benchmark/hud/useDraggable';
import type { Point } from '@/benchmark/hud/useDraggable';
import { FIELD_COUNTS, TIERS } from '@/benchmark/config';
import type { FieldCount, Impl } from '@/benchmark/config';
import { cx } from '@/utils/classNames';
import styles from './PerfHud.module.css';

/*
 * The floating window (BENCHMARK.md §"The floating window"): controls + live metrics
 * in one draggable, always-on-top panel. One per pane, so the side-by-side demo shows
 * two independent readouts. Its own re-renders are isolated from the form and applied
 * equally to every tier, so it doesn't bias the comparison.
 */
interface PerfHudProps {
  impl: Impl;
  onImplChange: (impl: Impl) => void;
  fields: FieldCount;
  onFieldsChange: (fields: FieldCount) => void;
  flash: boolean;
  onFlashChange: (flash: boolean) => void;
  position: Point;
  label: string;
}

const Metric = ({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
}) => (
  <div className={cx(styles.metric, accent && styles.metricAccent)}>
    <span className={styles.metricValue}>{value}</span>
    <span className={styles.metricLabel}>{label}</span>
  </div>
);

export const PerfHud = ({
  impl,
  onImplChange,
  fields,
  onFieldsChange,
  flash,
  onFlashChange,
  position,
  label,
}: PerfHudProps) => {
  const { pos, dragHandleProps } = useDraggable(position);
  const controller = useMetrics();

  const lastInteractionRenders = useMetricsState((s) => s.lastInteractionRenders);
  const totalRenders = useMetricsState((s) => s.totalRenders);
  const lastInp = useMetricsState((s) => s.lastInp);
  const inpP95 = useMetricsState((s) => s.inpP95);
  const inpMax = useMetricsState((s) => s.inpMax);
  const fps = useMetricsState((s) => s.fps);
  const longTasks = useMetricsState((s) => s.longTasks);

  return (
    <section
      className={styles.hud}
      style={{ left: `${pos.x}px`, top: `${pos.y}px` }}
      aria-label={`Performance HUD — ${label}`}
    >
      <header className={styles.titleBar} {...dragHandleProps}>
        <span className={styles.grip} aria-hidden>
          ⠿
        </span>
        <span className={styles.title}>{label}</span>
      </header>

      <div className={styles.controls}>
        <div className={styles.segmented} role="group" aria-label="State implementation">
          {TIERS.map((tier) => (
            <button
              key={tier.value}
              type="button"
              className={cx(styles.segment, impl === tier.value && styles.segmentActive)}
              onClick={() => onImplChange(tier.value)}
            >
              {tier.label}
            </button>
          ))}
        </div>

        <div className={styles.row}>
          <label className={styles.selectLabel}>
            Fields
            <select
              className={styles.select}
              value={fields}
              onChange={(event) => onFieldsChange(Number(event.target.value) as FieldCount)}
            >
              {FIELD_COUNTS.map((count) => (
                <option key={count} value={count}>
                  {count}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.checkbox}>
            <input
              type="checkbox"
              checked={flash}
              onChange={(event) => onFlashChange(event.target.checked)}
            />
            Flash
          </label>

          <button type="button" className={styles.reset} onClick={() => controller.reset()}>
            Reset
          </button>
        </div>
      </div>

      <div className={styles.metrics}>
        <Metric label="Renders / interaction" value={lastInteractionRenders} accent />
        <Metric label="Latency (ms)" value={lastInp.toFixed(0)} />
        <Metric label="INP p95 / max" value={`${inpP95.toFixed(0)} / ${inpMax.toFixed(0)}`} />
        <Metric label="FPS" value={fps} />
        <Metric label="Total renders" value={totalRenders} />
        <Metric label="Long tasks" value={longTasks} />
      </div>

      <footer className={styles.footer}>
        impl={impl} · fields={fields}
      </footer>
    </section>
  );
};
