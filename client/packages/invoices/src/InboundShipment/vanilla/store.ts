// Minimal observable store used in place of react-query inside the island.
// setState shallow-merges and notifies subscribers, which trigger a re-render.

export interface Store<T> {
  getState: () => T;
  setState: (partial: Partial<T>) => void;
  subscribe: (listener: () => void) => () => void;
}

export const createStore = <T extends object>(initial: T): Store<T> => {
  let state = initial;
  const listeners = new Set<() => void>();

  return {
    getState: () => state,
    setState: partial => {
      state = { ...state, ...partial };
      listeners.forEach(l => l());
    },
    subscribe: listener => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
};
