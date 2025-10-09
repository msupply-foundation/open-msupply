import { useCallback, useMemo } from 'react';
import {
  getDefaultColumnOrderIds,
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
