import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getDefaultColumnOrderIds,
  MRT_ColumnOrderState,
  MRT_RowData,
  MRT_StatefulTableOptions,
  MRT_TableOptions,
} from 'material-react-table';
import { isEqual } from '@common/utils';
import { getSavedState, updateSavedState, differentOrUndefined } from './utils';
import { ColumnDef } from '../types';
import { useGlobalTableDefaults } from './useGlobalTableConfig';

export const useColumnOrder = <T extends MRT_RowData>(
  tableId: string,
  columns: ColumnDef<T>[],
  enableRowSelection: MRT_TableOptions<T>['enableRowSelection'],
  enableExpanding: MRT_TableOptions<T>['enableExpanding']
) => {
  const globalDefaults = useGlobalTableDefaults(tableId);
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
      enableExpanding, // adds `mrt-row-expand`
    } as MRT_StatefulTableOptions<MRT_RowData>);
  }, [columns, enableRowSelection, enableExpanding]);

  const [state, setState] = useState<MRT_ColumnOrderState>(
    getSavedState(tableId)?.columnOrder ??
      globalDefaults?.columnOrder ??
      initial
  );

  // If initial state changes (due to plugin column loading, for example) and no
  // custom column order has been saved, update the column order to the new
  // default. Use functional updater to avoid rerender when content is unchanged.
  useEffect(() => {
    if (!getSavedState(tableId)?.columnOrder)
      setState(prev => {
        const next = globalDefaults?.columnOrder ?? initial;
        return isEqual(prev, next) ? prev : next;
      });
  }, [initial, enableExpanding]);

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
    [initial]
  );

  return {
    initial,
    state: state ?? initial,
    update,
  };
};
