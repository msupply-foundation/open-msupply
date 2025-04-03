import { useState } from 'react';
import {
  IndicatorLineRowFragment,
  IndicatorValueFragment,
  useRequest,
} from '../../api';
import { useDebounceCallback, useNotification } from '@common/hooks';
import { useNavigate, useParams } from '@openmsupply-client/common';
import { buildIndicatorEditRoute } from '../utils';

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

export const useDraftIndicatorValue = (
  indicatorValue: IndicatorValueFragment
) => {
  const { mutateAsync, isLoading } = useRequest.document.updateIndicatorValue();
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

export const useIndicatorNavigation = (requisitionId?: string) => {
  const navigate = useNavigate();
  const { programIndicatorCode } = useParams();

  return (indicatorId: string | undefined) => {
    if (!requisitionId || !programIndicatorCode || !indicatorId) return;

    navigate(
      buildIndicatorEditRoute(
        requisitionId,
        programIndicatorCode,
        indicatorId
      )
    );
  };
};
