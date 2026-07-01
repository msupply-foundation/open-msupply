import { useDerived } from '@/benchmark/StateAdapter';
import type { FieldValue } from '@/benchmark/StateAdapter';
import { useRenderTracker } from '@/benchmark/hud/useRenderTracker';
import styles from './Readers.module.css';

/*
 * Reactive readers that consume the draft. The SAME set is used in every tier so the
 * derived-recompute cost is held equal — the only variable the benchmark exposes is
 * how many UNRELATED components re-render. A reader correctly re-renders whenever its
 * derived value actually changes (true in every tier); some values change on every
 * keystroke (total, JSON), others only occasionally (count, valid, progress) — under
 * Zustand the latter stay still while under naive everything re-renders regardless.
 */
const toNumber = (value: FieldValue): number =>
  (typeof value === 'number' ? value : Number(value)) || 0;

const isFilled = (value: FieldValue): boolean => String(value).trim() !== '';

const RunningTotal = () => {
  const ref = useRenderTracker();
  const total = useDerived((draft) =>
    Object.values(draft.values).reduce<number>((sum, value) => sum + toNumber(value), 0)
  );
  return (
    <div ref={ref} className={styles.reader}>
      <span className={styles.label}>Running total</span>
      <span className={styles.value}>{total.toLocaleString()}</span>
    </div>
  );
};

const ItemCount = () => {
  const ref = useRenderTracker();
  const count = useDerived(
    (draft) => Object.values(draft.values).filter(isFilled).length
  );
  return (
    <div ref={ref} className={styles.reader}>
      <span className={styles.label}>Filled fields</span>
      <span className={styles.value}>{count}</span>
    </div>
  );
};

const ValidationSummary = () => {
  const ref = useRenderTracker();
  const invalid = useDerived(
    (draft) => Object.values(draft.values).filter((value) => toNumber(value) < 0).length
  );
  return (
    <div ref={ref} className={styles.reader}>
      <span className={styles.label}>Validation</span>
      <span className={invalid === 0 ? styles.value : styles.valueError}>
        {invalid === 0 ? 'All valid' : `${invalid} negative`}
      </span>
    </div>
  );
};

const ProgressBar = () => {
  const ref = useRenderTracker();
  const percent = useDerived((draft) => {
    const values = Object.values(draft.values);
    if (values.length === 0) return 0;
    return Math.round((values.filter(isFilled).length / values.length) * 100);
  });
  return (
    <div ref={ref} className={styles.reader}>
      <span className={styles.label}>Progress</span>
      <span className={styles.progressTrack}>
        <span className={styles.progressFill} style={{ inlineSize: `${percent}%` }} />
      </span>
    </div>
  );
};

const JsonPreview = () => {
  const ref = useRenderTracker();
  const json = useDerived((draft) => JSON.stringify(draft.values));
  return (
    <div ref={ref} className={styles.jsonReader}>
      <span className={styles.label}>Live JSON</span>
      <code className={styles.json}>{`${json.slice(0, 160)}…`}</code>
    </div>
  );
};

export const ReadersPanel = () => (
  <div className={styles.panel}>
    <RunningTotal />
    <ItemCount />
    <ValidationSummary />
    <ProgressBar />
    <JsonPreview />
  </div>
);
