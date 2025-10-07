import { useCallback, useMemo } from 'react';
import {
  getDefaultColumnOrderIds,
  MRT_ColumnDef,
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

  const savedState = getSavedState(tableId).columnOrder;
  // Memoise to prevent re-renders
  const state = useMemo(() => savedState, [savedState?.toString()]);

  const update = useCallback<
    NonNullable<MRT_TableOptions<MRT_RowData>['onColumnOrderChange']>
  >(
    updaterOrValue => {
      const newColumnOrder =
        typeof updaterOrValue === 'function'
          ? updaterOrValue(state ?? initial)
          : updaterOrValue;

      updateSavedState(tableId, {
        columnOrder: differentOrUndefined(newColumnOrder, initial),
      });
      return newColumnOrder;
    },
    [initial, state]
  );

  return { initial, state: state ?? initial, update };
};
