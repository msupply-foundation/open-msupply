import { createContext, useContext } from 'react';

/*
 * The one interface every tier implements. The form under test is written ONCE
 * against these hooks and never knows which implementation is mounted — swapping
 * the state mechanism is the whole experiment, so nothing else may differ.
 *
 * Delivered via React context: each tier's provider builds a STABLE adapter object
 * (see the providers) and supplies it here. Because the adapter identity never
 * changes for a mount, `useAdapter()` reading it does not itself fan out re-renders
 * — the per-tier subscription cost lives entirely inside `useField`/`useDerived`.
 */
export type FieldValue = string | number;

export interface Draft {
  values: Record<string, FieldValue>;
}

export interface StateAdapter {
  useField(path: string): readonly [FieldValue, (value: FieldValue) => void];
  useDerived<T>(selector: (draft: Draft) => T): T;
  reset(initial: Draft): void;
}

const AdapterContext = createContext<StateAdapter | null>(null);

export const AdapterProvider = AdapterContext.Provider;

export const useAdapter = (): StateAdapter => {
  const adapter = useContext(AdapterContext);
  if (!adapter) {
    throw new Error('useAdapter must be used within a <StateProvider>');
  }
  return adapter;
};

/*
 * Form-facing hooks. The form imports THESE — clean, tier-agnostic names — and the
 * indirection through the context-supplied adapter stays invisible to it.
 */
export const useField = (path: string) => useAdapter().useField(path);

export const useDerived = <T>(selector: (draft: Draft) => T): T =>
  useAdapter().useDerived(selector);
