import { useEffect, useMemo, useState } from 'react';
import { BenchmarkPane } from '@/benchmark/BenchmarkPane';
import { readParams, writeParams } from '@/benchmark/config';
import type { FieldCount, Impl, Mode } from '@/benchmark/config';
import { cx } from '@/utils/classNames';
import styles from './BenchmarkPage.module.css';

/*
 * The Performance tab. Three entry points onto one switch (BENCHMARK.md §"Switching
 * between approaches"):
 *   - Single      — one full-width pane; flip tiers live in the HUD.
 *   - Side-by-side — two independent panes (naive vs Zustand by default), each with its
 *                    own HUD, so "312 renders" sits beside "1 render" at once.
 *   - URL params  — ?mode= / ?impl= / ?fields= seed state at boot and mirror back, so a
 *                   demo state is shareable.
 * Field count is shared across side-by-side panes so the comparison stays apples-to-apples.
 */
export const BenchmarkPage = () => {
  const boot = useMemo(() => readParams(), []);
  const [mode, setMode] = useState<Mode>(boot.mode);
  const [fields, setFields] = useState<FieldCount>(boot.fields);
  const [singleImpl, setSingleImpl] = useState<Impl>(boot.impl);
  const [leftImpl, setLeftImpl] = useState<Impl>('naive');
  const [rightImpl, setRightImpl] = useState<Impl>('zustand');

  useEffect(() => {
    writeParams({ mode, impl: singleImpl, fields });
  }, [mode, singleImpl, fields]);

  return (
    <div className={styles.page}>
      <header className={styles.intro}>
        <h2 className={styles.heading}>State-management benchmark</h2>
        <p className={styles.lede}>
          One controlled form, three state implementations, swapped at runtime — the only
          difference between conditions is the state mechanism. Type into a field and watch
          the render count: the naive single-context store re-renders the whole form on every
          keystroke; Zustand’s per-field selector subscriptions re-render only what changed.
          For honest numbers, run a production build (<code>yarn build &amp;&amp; yarn preview</code>)
          under CPU throttle — the dev server exaggerates the gap.
        </p>
        <div className={styles.modeSwitch} role="group" aria-label="Demo mode">
          <button
            type="button"
            className={cx(styles.modeButton, mode === 'single' && styles.modeActive)}
            onClick={() => setMode('single')}
          >
            Single
          </button>
          <button
            type="button"
            className={cx(styles.modeButton, mode === 'side' && styles.modeActive)}
            onClick={() => setMode('side')}
          >
            Side-by-side
          </button>
        </div>
      </header>

      {mode === 'single' ? (
        <BenchmarkPane
          impl={singleImpl}
          onImplChange={setSingleImpl}
          fields={fields}
          onFieldsChange={setFields}
          hudPosition={{ x: 32, y: 112 }}
          label="Single"
        />
      ) : (
        <div className={styles.sideBySide}>
          <BenchmarkPane
            impl={leftImpl}
            onImplChange={setLeftImpl}
            fields={fields}
            onFieldsChange={setFields}
            hudPosition={{ x: 32, y: 112 }}
            label="Left"
          />
          <BenchmarkPane
            impl={rightImpl}
            onImplChange={setRightImpl}
            fields={fields}
            onFieldsChange={setFields}
            hudPosition={{ x: 380, y: 112 }}
            label="Right"
          />
        </div>
      )}
    </div>
  );
};
