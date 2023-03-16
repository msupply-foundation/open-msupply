import { useCallback } from 'react';
import { TableStore, useTableStore } from '../TableContext';

interface UseExpandedControl {
  isExpanded: boolean;
  rowId: string;
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
    oldState: UseExpandedControl,
    newState: UseExpandedControl
  ) =>
    oldState?.isExpanded === newState?.isExpanded &&
    oldState.rowId === newState.rowId;

  return useTableStore(selector, equalityFn);
};
