import { memo } from 'react';
import { useField } from '@/benchmark/StateAdapter';
import { useMetrics } from '@/benchmark/metrics/metricsContext';
import { useRenderTracker } from '@/benchmark/hud/useRenderTracker';
import styles from './FieldInput.module.css';

/*
 * One controlled input, written ONCE against the adapter — identical in every tier
 * (verifiable in the diff: it imports `useField`, never a tier). Wrapped in
 * React.memo so a parent re-render never cascades here; the only thing that re-renders
 * it is its own field subscription firing. `beginInteraction()` marks the start of an
 * interaction so the HUD can attribute the resulting renders to it.
 */
interface FieldInputProps {
  path: string;
  index: number;
}

export const FieldInput = memo(({ path, index }: FieldInputProps) => {
  const [value, setValue] = useField(path);
  const metrics = useMetrics();
  const ref = useRenderTracker<HTMLLabelElement>();

  return (
    <label ref={ref} className={styles.field}>
      <span className={styles.index}>{index}</span>
      <input
        className={styles.input}
        inputMode="numeric"
        value={String(value)}
        onChange={(event) => {
          metrics.beginInteraction();
          setValue(event.target.value);
        }}
      />
    </label>
  );
});
FieldInput.displayName = 'FieldInput';
