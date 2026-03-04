import { useCallback, useState } from 'react';
import { getSavedState, updateSavedState } from './utils';

export const useIsGrouped = (
  tableId: string,
  defaultValue: boolean = false
) => {
  const [state, setState] = useState<boolean>(
    getSavedState(tableId).isGrouped ?? defaultValue
  );

  const toggleGrouped = useCallback(
    () =>
      setState(prev => {
        const isGrouped = !prev;

        updateSavedState(tableId, { isGrouped });
        return isGrouped;
      }),
    []
  );

  const resetGrouped = () => setState(defaultValue);

  return { isGrouped: state, toggleGrouped, resetGrouped };
};
