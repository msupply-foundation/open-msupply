import { useMemo, useState } from 'react';
import { FlashContext } from '@/benchmark/metrics/metricsContext';
import { MetricsProvider } from '@/benchmark/metrics/MetricsProvider';
import { StateProvider } from '@/benchmark/providers/StateProvider';
import { BenchmarkForm } from '@/benchmark/BenchmarkForm';
import { PerfHud } from '@/benchmark/hud/PerfHud';
import { makeInitialDraft } from '@/benchmark/config';
import type { FieldCount, Impl } from '@/benchmark/config';
import type { Point } from '@/benchmark/hud/useDraggable';
import styles from './BenchmarkPane.module.css';

/*
 * One self-contained condition: its own metrics scope (so side-by-side panes don't
 * interfere), the tier provider, the form, and its own floating HUD. The provider is
 * keyed on `${impl}:${fields}` so switching either remounts it with fresh state.
 * Render-flash is a per-pane toggle held here and shared with the form via context.
 */
interface BenchmarkPaneProps {
  impl: Impl;
  onImplChange: (impl: Impl) => void;
  fields: FieldCount;
  onFieldsChange: (fields: FieldCount) => void;
  hudPosition: Point;
  label: string;
}

export const BenchmarkPane = ({
  impl,
  onImplChange,
  fields,
  onFieldsChange,
  hudPosition,
  label,
}: BenchmarkPaneProps) => {
  const [flash, setFlash] = useState(true);
  const initial = useMemo(() => makeInitialDraft(fields), [fields]);

  return (
    <MetricsProvider>
      <FlashContext.Provider value={flash}>
        <div className={styles.pane}>
          <StateProvider key={`${impl}:${fields}`} impl={impl} initial={initial}>
            <BenchmarkForm fields={fields} />
          </StateProvider>
        </div>
        <PerfHud
          impl={impl}
          onImplChange={onImplChange}
          fields={fields}
          onFieldsChange={onFieldsChange}
          flash={flash}
          onFlashChange={setFlash}
          position={hudPosition}
          label={label}
        />
      </FlashContext.Provider>
    </MetricsProvider>
  );
};
