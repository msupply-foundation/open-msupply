import { useCallback, useState } from 'react';
import { getSavedState, updateSavedState } from './utils';
import { MRT_RowData, MRT_TableOptions } from 'material-react-table';

export const useColumnGrouping = (
  tableId: string,
  setHasSavedState: (hasSavedState: boolean) => void,
  groupingInput?: {
    field: string;
    groupedByDefault?: boolean;
  },
) => {
  const initial = groupingInput?.groupedByDefault ? [groupingInput.field] : [];

  const [state, setState] = useState<string[]>(
    getSavedState(tableId)?.grouping ?? initial
  );

  const update = useCallback<
    NonNullable<MRT_TableOptions<MRT_RowData>['onGroupingChange']>
  >(
    updaterOrValue =>
      setState(prev => {
        const newGrouping =
          typeof updaterOrValue === 'function'
            ? updaterOrValue(prev)
            : updaterOrValue;
        
        const savedGrouping = newGrouping.length ? newGrouping : undefined;
        updateSavedState(tableId, { grouping: savedGrouping });
        if (savedGrouping) setHasSavedState(true);
        return newGrouping;
      }),
    []
  )

  const toggle = useCallback(
    () =>
      setState(prev => {
        setHasSavedState(true);
        if (prev.length || groupingInput === undefined) {
          updateSavedState(tableId, { grouping: [] });
          return [];
        } else {
          updateSavedState(tableId, { grouping: [groupingInput.field] });
          return [groupingInput.field];
        }
      }),
    []
  );

  return {
    initial,
    state,
    enabled: !!groupingInput,
    update,
    toggle,
  };
};
