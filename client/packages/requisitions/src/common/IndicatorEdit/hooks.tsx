import { useState } from 'react';
import { useDebounceCallback, useNotification } from '@common/hooks';
import {
  IndicatorLineRowFragment,
  IndicatorValueFragment,
} from '../../RequestRequisition/api';

export const usePreviousNextIndicatorLine = (
  lines?: IndicatorLineRowFragment[],
  currentLine?: IndicatorLineRowFragment
) => {
  if (!lines) {
    return { hasNext: false, next: null, hasPrevious: false, previous: null };
  }

  const state: {
    hasPrevious: boolean;
    previous: null | IndicatorLineRowFragment;
    hasNext: boolean;
    next: null | IndicatorLineRowFragment;
  } = { hasNext: true, next: null, hasPrevious: true, previous: null };
  const idx = lines.findIndex(l => l.id === currentLine?.id);
  const previous = lines[idx - 1];
  const next = lines[idx + 1];

  if (!previous) {
    state.hasPrevious = false;
  } else {
    state.previous = previous;
  }

  if (!next) {
    state.hasNext = false;
  } else {
    state.next = next;
  }

  return state;
};

// Request and Response each provide their own mutation hook — the shape is
// identical, so the shared draft hook just accepts one and calls it.
export type UseUpdateIndicatorValue = () => {
  mutateAsync: (input: IndicatorValueFragment) => Promise<unknown>;
  isLoading: boolean;
};

export const useDraftIndicatorValue = (
  indicatorValue: IndicatorValueFragment,
  useUpdate: UseUpdateIndicatorValue
) => {
  const { mutateAsync, isLoading } = useUpdate();
  const { error } = useNotification();
  const [draft, setDraft] = useState<IndicatorValueFragment>(indicatorValue);
  const save = useDebounceCallback(
    (patch: Partial<IndicatorValueFragment>) =>
      mutateAsync({ ...draft, ...patch }).catch(e => error(e.message)()),
    [],
    500
  );

  const update = (patch: Partial<IndicatorValueFragment>) => {
    const newDraft = { ...draft, ...patch };
    setDraft(newDraft);
    return save(newDraft);
  };

  return { draft, isLoading, update };
};
