import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getDefaultColumnOrderIds,
  MRT_ColumnOrderState,
  MRT_RowData,
  MRT_StatefulTableOptions,
  MRT_TableOptions,
} from 'material-react-table';
import { getSavedState, updateSavedState, differentOrUndefined } from './utils';
import { ColumnDef } from '../types';

export const useColumnOrder = <T extends MRT_RowData>(
  tableId: string,
  columns: ColumnDef<T>[],
  enableRowSelection: MRT_TableOptions<T>['enableRowSelection'],
  isGrouped: boolean
) => {
  const initial = useMemo(() => {
    for (const col of columns) {
      // if column has a custom columnIndex, remove it from its current position
      // and insert it at the specified index
      if (col.columnIndex !== undefined) {
        const currentIndex = columns.indexOf(col);
        if (currentIndex > -1) {
          columns.splice(currentIndex, 1);
          columns.splice(col.columnIndex, 0, col);
        }
      }
    }

    return getDefaultColumnOrderIds({
      columns,
      state: {},
      enableRowSelection, // adds `mrt-row-select`
      enableExpanding: !!isGrouped, // adds `mrt-row-expand`
      positionExpandColumn: 'first', // this is the default, but needs to be explicitly set here
    } as MRT_StatefulTableOptions<MRT_RowData>);
  }, [isGrouped, columns]);

  const [state, setState] = useState<MRT_ColumnOrderState>(
    getSavedState(tableId).columnOrder ?? initial
  );
  const [hasSavedState, setHasSavedState] = useState(
    !!getSavedState(tableId).columnOrder
  );

  // If initial state changes (due to plugin column loading, for example) and no
  // custom column order has been saved, update the column order to the new
  // default
  useEffect(() => {
    if (!getSavedState(tableId).columnOrder) setState(initial);
  }, [initial]);

  const update = useCallback<
    NonNullable<MRT_TableOptions<MRT_RowData>['onColumnOrderChange']>
  >(
    updaterOrValue =>
      setState(prev => {
        const newColumnOrder =
          typeof updaterOrValue === 'function'
            ? updaterOrValue(prev)
            : updaterOrValue;

        const savedColumnOrder = differentOrUndefined(
          newColumnOrder,
          state ?? initial
        );
        updateSavedState(tableId, {
          columnOrder: savedColumnOrder,
        });
        if (savedColumnOrder) setHasSavedState(true);
        return newColumnOrder;
      }),
    [initial, state]
  );

  return {
    initial,
    state: state ?? initial,
    update,
    hasSavedState,
    resetHasSavedState: () => setHasSavedState(false),
  };
};
