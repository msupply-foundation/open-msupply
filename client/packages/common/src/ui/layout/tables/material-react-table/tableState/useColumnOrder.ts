import { useCallback, useMemo, useState } from 'react';
import {
  getDefaultColumnOrderIds,
  MRT_ColumnDef,
  MRT_ColumnOrderState,
  MRT_RowData,
  MRT_StatefulTableOptions,
  MRT_TableOptions,
} from 'material-react-table';
import { getSavedState, updateSavedState, differentOrUndefined } from './utils';

export const useColumnOrder = <T extends MRT_RowData>(
  tableId: string,
  columns: MRT_ColumnDef<T>[],
  enableRowSelection: MRT_TableOptions<T>['enableRowSelection'],
  isGrouped: boolean
) => {
  const initial = useMemo(
    () =>
      getDefaultColumnOrderIds({
        columns,
        state: {},
        enableRowSelection, // adds `mrt-row-select`
        enableExpanding: !!isGrouped, // adds `mrt-row-expand`
        positionExpandColumn: 'first', // this is the default, but needs to be explicitly set here
      } as MRT_StatefulTableOptions<MRT_RowData>),

    [isGrouped, columns]
  );

  const [state, setState] = useState<MRT_ColumnOrderState>(
    getSavedState(tableId).columnOrder ?? initial
  );

  const update = useCallback<
    NonNullable<MRT_TableOptions<MRT_RowData>['onColumnOrderChange']>
  >(
    updaterOrValue =>
      setState(prev => {
        const newColumnOrder =
          typeof updaterOrValue === 'function'
            ? updaterOrValue(prev)
            : updaterOrValue;

        updateSavedState(tableId, {
          columnOrder: differentOrUndefined(newColumnOrder, initial),
        });
        return newColumnOrder;
      }),
    []
  );

  return { initial, state, update };
};
