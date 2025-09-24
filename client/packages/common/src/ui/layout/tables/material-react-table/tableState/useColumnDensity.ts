import { useCallback, useState } from 'react';
import {
  MRT_DensityState,
  MRT_RowData,
  MRT_TableOptions,
} from 'material-react-table';
import { getSavedState, updateSavedState, differentOrUndefined } from './utils';

export const useColumnDensity = (tableId: string) => {
  const initial: MRT_DensityState = 'comfortable';

  const [state, setState] = useState<MRT_DensityState>(
    getSavedState(tableId).density ?? initial
  );

  const update = useCallback<
    NonNullable<MRT_TableOptions<MRT_RowData>['onDensityChange']>
  >(
    updaterOrValue =>
      setState(prev => {
        const newDensity =
          typeof updaterOrValue === 'function'
            ? updaterOrValue(prev)
            : updaterOrValue;

        updateSavedState(tableId, {
          density: differentOrUndefined(newDensity, initial),
        });
        return newDensity;
      }),
    []
  );

  return { initial, state, update };
};
