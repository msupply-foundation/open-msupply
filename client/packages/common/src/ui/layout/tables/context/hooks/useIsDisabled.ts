import { useCallback } from 'react';
import { TableStore, useTableStore } from '../TableContext';

interface UseIsDisabledControl {
  isDisabled: boolean;
  // toggleDisabled: () => void; // TODO: Is this needed?
}

export const useIsDisabled = (rowId: string): UseIsDisabledControl => {
  const selector = useCallback(
    (state: TableStore) => {
      return {
        rowId,
        isDisabled: state.rowState[rowId]?.isDisabled ?? false,
      };
    },
    [rowId]
  );

  const equalityFn = (
    oldState: ReturnType<typeof selector>,
    newState: ReturnType<typeof selector>
  ) =>
    oldState?.isDisabled === newState?.isDisabled &&
    oldState.rowId === newState.rowId;

  return useTableStore(selector, equalityFn);
};
