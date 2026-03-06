import { useCallback, useState } from 'react';
import { getSavedState, updateSavedState, ViewMode } from './utils';

export const useViewMode = (
  tableId: string,
  defaultMode: ViewMode = 'table'
) => {
  const [viewMode, setViewModeState] = useState<ViewMode>(
    getSavedState(tableId).viewMode ?? defaultMode
  );

  const setViewMode = useCallback(
    (mode: ViewMode) => {
      setViewModeState(mode);
      updateSavedState(tableId, { viewMode: mode });
    },
    [tableId]
  );

  return { viewMode, setViewMode };
};
