import { useCallback, useState } from 'react';
import { getSavedState, updateSavedState } from './utils';
import { useGlobalTableDefaults } from './useGlobalTableConfig';

export const useIsGrouped = (
  tableId: string,
  defaultValue: boolean = false
) => {
  const globalDefaults = useGlobalTableDefaults(tableId);
  const [state, setState] = useState<boolean>(
    getSavedState(tableId).isGrouped ??
      globalDefaults?.isGrouped ??
      defaultValue
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
