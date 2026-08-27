import { useCallback, useState } from 'react';
import { differentOrUndefined, getSavedState, updateSavedState } from './utils';
import { MRT_RowData, MRT_TableOptions } from 'material-react-table';

export const useColumnGrouping = (
  tableId: string,
  groupingInput?: {
    field: string;
    groupedByDefault?: boolean;
  }
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

        updateSavedState(tableId, {
          grouping: differentOrUndefined(newGrouping, initial),
        });

        return newGrouping;
      }),
    []
  );

  const toggle = useCallback(
    () =>
      setState(prev => {
        if (prev.length || groupingInput === undefined) {
          update([]);
          return [];
        } else {
          update([groupingInput.field]);
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
