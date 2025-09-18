import { useCallback, useState } from 'react';
import {
  MRT_ColumnSizingState,
  MRT_RowData,
  MRT_TableOptions,
} from 'material-react-table';
import { getSavedState, updateSavedState, differentOrUndefined } from './utils';

export const useColumnSizing = (tableId: string) => {
  const initial = { 'mrt-row-expand': 40 };

  const [state, setState] = useState<MRT_ColumnSizingState>(
    getSavedState(tableId).columnSizing ?? initial
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

        updateSavedState(tableId, {
          columnSizing: differentOrUndefined(newColumnSizing, initial),
        });
        return newColumnSizing;
      }),
    []
  );

  return { initial, state, update };
};
