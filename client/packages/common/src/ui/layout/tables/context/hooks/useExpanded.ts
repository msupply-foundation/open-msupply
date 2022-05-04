import { useCallback } from 'react';
import { useTableStore, TableStore } from '../TableContext';

interface UseExpandedControl {
  isExpanded: boolean;
  toggleExpanded: () => void;
}

export const useExpanded = (rowId: string): UseExpandedControl => {
  const selector = useCallback(
    (state: TableStore) => ({
      rowId,
      isExpanded: state.rowState[rowId]?.isExpanded ?? false,
      toggleExpanded: () => state.toggleExpanded(rowId),
    }),
    [rowId]
  );

  const equalityFn = (
    oldState: ReturnType<typeof selector>,
    newState: ReturnType<typeof selector>
  ) =>
    oldState?.isExpanded === newState?.isExpanded &&
    oldState.rowId === newState.rowId;

  return useTableStore(selector, equalityFn);
};
