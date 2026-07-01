import { createContext, useContext, useMemo, useRef } from 'react';
import type { ReactNode } from 'react';
import { useStore } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { AdapterProvider } from '@/benchmark/StateAdapter';
import type { Draft, FieldValue, StateAdapter } from '@/benchmark/StateAdapter';
import { createFormStore } from '@/benchmark/store/formStore';
import type { FormStore } from '@/benchmark/store/formStore';

/*
 * Tier 3 — the proposal. An external store with per-field selector subscriptions.
 * `useField` subscribes to `s => s.values[path]`, so Zustand's Object.is check on the
 * selector output re-renders ONLY the field whose value changed — even though the
 * `values` object is replaced wholesale. Readers subscribe via `useShallow`, so they
 * re-render only when their derived value actually changes.
 */
const StoreContext = createContext<FormStore | null>(null);

const useFormStore = (): FormStore => {
  const store = useContext(StoreContext);
  if (!store) throw new Error('Zustand tier store missing');
  return store;
};

const useZustandField = (path: string) => {
  const store = useFormStore();
  const value = useStore(store, (state) => state.values[path] ?? '');
  const setValue = (next: FieldValue) => store.getState().setValue(path, next);
  return [value, setValue] as const;
};

const useZustandDerived = <T,>(selector: (draft: Draft) => T): T => {
  const store = useFormStore();
  return useStore(
    store,
    useShallow((state) => selector({ values: state.values }))
  );
};

export const ZustandStateProvider = ({
  initial,
  children,
}: {
  initial: Draft;
  children: ReactNode;
}) => {
  const ref = useRef<FormStore | null>(null);
  if (ref.current === null) ref.current = createFormStore(initial);
  const store = ref.current;

  const adapter = useMemo<StateAdapter>(
    () => ({
      useField: useZustandField,
      useDerived: useZustandDerived,
      reset: (next: Draft) => store.getState().reset(next),
    }),
    [store]
  );

  return (
    <StoreContext.Provider value={store}>
      <AdapterProvider value={adapter}>{children}</AdapterProvider>
    </StoreContext.Provider>
  );
};
