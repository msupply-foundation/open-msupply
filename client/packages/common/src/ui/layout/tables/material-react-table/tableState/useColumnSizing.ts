import { useCallback, useState } from 'react';
import {
  MRT_ColumnSizingState,
  MRT_RowData,
  MRT_TableOptions,
} from 'material-react-table';
import { getSavedState, updateSavedState, differentOrUndefined } from './utils';
import { useDebounceCallback } from '@common/hooks';

export const useColumnSizing = (tableId: string) => {
  const initial = { 'mrt-row-expand': 40 };

  const [state, setState] = useState<MRT_ColumnSizingState>(
    getSavedState(tableId).columnSizing ?? initial
  );
  const [hasSavedState, setHasSavedState] = useState(
    !!getSavedState(tableId).columnSizing
  );

  const debouncedUpdateSavedState = useDebounceCallback(
    (newState: MRT_ColumnSizingState) => {
      const savedColumnSizing = differentOrUndefined(newState, initial);
      updateSavedState(tableId, {
        columnSizing: savedColumnSizing,
      });
      if (savedColumnSizing) setHasSavedState(true);
    },
    [],
    500
  );

  const update = useCallback<
    NonNullable<MRT_TableOptions<MRT_RowData>['onColumnSizingChange']>
  >(
    updaterOrValue =>
      setState(prev => {
        const newColumnSizing =
          typeof updaterOrValue === 'function'
            ? updaterOrValue(prev)
            : updaterOrValue;

        debouncedUpdateSavedState(newColumnSizing);
        return newColumnSizing;
      }),
    []
  );

  return {
    initial,
    state,
    update,
    hasSavedState,
    resetHasSavedState: () => setHasSavedState(false),
  };
};
