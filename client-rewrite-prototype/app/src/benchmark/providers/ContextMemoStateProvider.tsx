import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { AdapterProvider } from '@/benchmark/StateAdapter';
import type { Draft, FieldValue, StateAdapter } from '@/benchmark/StateAdapter';
import { GROUP_COUNT, groupOfPath } from '@/benchmark/config';

/*
 * Tier 2 — the honest ceiling of the incremental "just add memo / split the context"
 * fix. Three techniques stacked:
 *   1. The setter lives in its own STABLE context, split from the values.
 *   2. Inputs are React.memo'd (see FieldInput).
 *   3. The values are SHARDED into fixed-size regions, one context per region. A
 *      keystroke rewrites only its region's slice (others keep reference identity),
 *      so only that region's inputs re-render — ~GROUP_SIZE, not N.
 *
 * The result is a genuine middle curve: better than naive, but it can't reach
 * per-field granularity without a selector store (that's what tier 3 buys). Readers
 * still aggregate the whole draft, so they read a full-draft context and re-render
 * each keystroke — the same honest cost naive pays for readers.
 */
type GroupSlice = Record<string, FieldValue>;
type SetValue = (path: string, value: FieldValue) => void;

// Module-scope pool so context identities are stable across renders/mounts.
const GROUP_CONTEXTS = Array.from({ length: GROUP_COUNT }, () =>
  createContext<GroupSlice>({})
);
const SetterContext = createContext<SetValue>(() => {});
const FullDraftContext = createContext<Draft>({ values: {} });

const partition = (draft: Draft): GroupSlice[] => {
  const slices: GroupSlice[] = [];
  for (const [path, value] of Object.entries(draft.values)) {
    const group = groupOfPath(path);
    (slices[group] ??= {})[path] = value;
  }
  for (let i = 0; i < slices.length; i++) slices[i] ??= {};
  return slices;
};

const useContextMemoField = (path: string) => {
  const slice = useContext(GROUP_CONTEXTS[groupOfPath(path)]);
  const setValue = useContext(SetterContext);
  return [slice[path] ?? '', (value: FieldValue) => setValue(path, value)] as const;
};

const useContextMemoDerived = <T,>(selector: (draft: Draft) => T): T => {
  const draft = useContext(FullDraftContext);
  return selector(draft);
};

export const ContextMemoStateProvider = ({
  initial,
  children,
}: {
  initial: Draft;
  children: ReactNode;
}) => {
  const [groups, setGroups] = useState<GroupSlice[]>(() => partition(initial));

  const setValue = useCallback<SetValue>((path, value) => {
    const group = groupOfPath(path);
    setGroups((prev) =>
      prev.map((slice, index) =>
        index === group ? { ...slice, [path]: value } : slice
      )
    );
  }, []);

  const reset = useCallback((next: Draft) => setGroups(partition(next)), []);

  const fullDraft = useMemo<Draft>(
    () => ({ values: Object.assign({}, ...groups) }),
    [groups]
  );

  const adapter = useMemo<StateAdapter>(
    () => ({ useField: useContextMemoField, useDerived: useContextMemoDerived, reset }),
    [reset]
  );

  // Nest one provider per active region around the (stable) children.
  let tree: ReactNode = (
    <SetterContext.Provider value={setValue}>
      <FullDraftContext.Provider value={fullDraft}>
        <AdapterProvider value={adapter}>{children}</AdapterProvider>
      </FullDraftContext.Provider>
    </SetterContext.Provider>
  );
  for (let group = groups.length - 1; group >= 0; group--) {
    const RegionContext = GROUP_CONTEXTS[group];
    tree = (
      <RegionContext.Provider value={groups[group]}>{tree}</RegionContext.Provider>
    );
  }
  return tree;
};
