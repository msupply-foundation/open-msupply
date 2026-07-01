import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { AdapterProvider } from '@/benchmark/StateAdapter';
import type { Draft, FieldValue, StateAdapter } from '@/benchmark/StateAdapter';

/*
 * Tier 1 — the accidental default, and today's pain. A single Draft object lives in
 * one React context; every field and every reader consumes it. `setValue` replaces
 * the object, so the context value changes on EVERY keystroke and ALL consumers
 * re-render — the whole form, not just the field that changed. No memoisation.
 */
interface NaiveContextValue {
  draft: Draft;
  setValue: (path: string, value: FieldValue) => void;
}

const NaiveContext = createContext<NaiveContextValue | null>(null);

const useNaive = (): NaiveContextValue => {
  const value = useContext(NaiveContext);
  if (!value) throw new Error('Naive tier context missing');
  return value;
};

const useNaiveField = (path: string) => {
  const { draft, setValue } = useNaive();
  return [draft.values[path] ?? '', (value: FieldValue) => setValue(path, value)] as const;
};

const useNaiveDerived = <T,>(selector: (draft: Draft) => T): T => {
  const { draft } = useNaive();
  return selector(draft);
};

export const NaiveStateProvider = ({
  initial,
  children,
}: {
  initial: Draft;
  children: ReactNode;
}) => {
  const [draft, setDraft] = useState<Draft>(initial);

  const setValue = useCallback((path: string, value: FieldValue) => {
    setDraft((prev) => ({ values: { ...prev.values, [path]: value } }));
  }, []);

  const reset = useCallback((next: Draft) => setDraft(next), []);

  const contextValue = useMemo<NaiveContextValue>(
    () => ({ draft, setValue }),
    [draft, setValue]
  );

  // Stable adapter identity — its hooks read the tier context fresh, so the fan-out
  // cost lives in NaiveContext, not in the adapter context.
  const adapter = useMemo<StateAdapter>(
    () => ({ useField: useNaiveField, useDerived: useNaiveDerived, reset }),
    [reset]
  );

  return (
    <NaiveContext.Provider value={contextValue}>
      <AdapterProvider value={adapter}>{children}</AdapterProvider>
    </NaiveContext.Provider>
  );
};
