import { useEffect, useState } from 'react';
import {
  IndicatorLineRowFragment,
  IndicatorValueFragment,
  useResponse,
} from '../../api';

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

const createDraftLine = (
  indicatorValue: IndicatorValueFragment
): IndicatorValueFragment => ({
  ...indicatorValue,
});

export const useDraftIndicatorValue = (
  IndicatorValue?: IndicatorValueFragment | null
) => {
  const { mutateAsync: save, isLoading } =
    useResponse.document.updateIndicatorValue();

  const [draft, setDraft] = useState<IndicatorValueFragment | null>(null);

  useEffect(() => {
    if (IndicatorValue) {
      setDraft(createDraftLine(IndicatorValue));
    }
    setDraft(null);
  }, [IndicatorValue]);

  const update = (patch: Partial<IndicatorValueFragment>) => {
    if (draft) {
      setDraft({ ...draft, ...patch });
    }
  };

  return { draft, isLoading, save: () => draft && save(draft), update };
};
