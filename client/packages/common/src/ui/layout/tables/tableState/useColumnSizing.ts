import { useCallback, useState } from 'react';
import type {
  MRT_ColumnSizingState,
  MRT_RowData,
  MRT_TableOptions,
} from 'material-react-table';
import { getSavedState, updateSavedState, differentOrUndefined } from './utils';
import { useDebounceCallback } from '@common/hooks';
import { useGlobalTableDefaults } from './useGlobalTableConfig';

export const useColumnSizing = (tableId: string) => {
  const initial = {};
  const globalDefaults = useGlobalTableDefaults(tableId);

  const [state, setState] = useState<MRT_ColumnSizingState>(
    getSavedState(tableId)?.columnSizing ??
      globalDefaults?.columnSizing ??
      initial
  );

  const debouncedUpdateSavedState = useDebounceCallback(
    (newState: MRT_ColumnSizingState) => {
      updateSavedState(tableId, {
        columnSizing: differentOrUndefined(newState, initial),
      });
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
  };
};
