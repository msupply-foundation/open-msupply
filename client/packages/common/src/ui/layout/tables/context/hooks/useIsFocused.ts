import { useCallback } from 'react';
import { useTableStoreWithSelector, TableStore } from '../TableContext';

interface UseIsFocusedControl {
  isFocused: boolean;
}

export const useIsFocused = (rowId: string): UseIsFocusedControl => {
  const selector = useCallback(
    (state: TableStore) => {
      return {
        rowId,
        isFocused: state.rowState[rowId]?.isFocused ?? false,
      };
    },
    [rowId]
  );

  const equalityFn = (
    oldState: ReturnType<typeof selector>,
    newState: ReturnType<typeof selector>
  ) =>
    oldState?.isFocused === newState?.isFocused &&
    oldState.rowId === newState.rowId;

  return useTableStoreWithSelector(selector, equalityFn);
};
