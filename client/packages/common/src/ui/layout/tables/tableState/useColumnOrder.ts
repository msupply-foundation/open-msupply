import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  MRT_ColumnOrderState,
  MRT_RowData,
  MRT_TableOptions,
} from '../mrtCompat';
import { getSavedState, updateSavedState, differentOrUndefined } from './utils';
import { ColumnDef } from '../types';
import { useGlobalTableDefaults } from './useGlobalTableConfig';

/** Replicates MRT's getDefaultColumnOrderIds without importing MRT. */
const getDefaultColumnOrderIds = <T extends MRT_RowData>(
  columns: ColumnDef<T>[],
  enableRowSelection?: boolean | ((row: unknown) => boolean),
  enableExpanding?: boolean
): string[] => {
  const ids: string[] = [];
  if (enableRowSelection) ids.push('mrt-row-select');
  if (enableExpanding) ids.push('mrt-row-expand');
  for (const col of columns) {
    const id = col.id ?? (col as { accessorKey?: string }).accessorKey ?? '';
    if (id) ids.push(id);
  }
  return ids;
};

export const useColumnOrder = <T extends MRT_RowData>(
  tableId: string,
  columns: ColumnDef<T>[],
  enableRowSelection?: boolean | ((row: unknown) => boolean),
  enableExpanding?: boolean
) => {
  const globalDefaults = useGlobalTableDefaults(tableId);
  const initial = useMemo(() => {
    const sorted = [...columns];
    for (const col of columns) {
      // if column has a custom columnIndex, remove it from its current position
      // and insert it at the specified index
      if (col.columnIndex !== undefined) {
        const currentIndex = sorted.indexOf(col);
        if (currentIndex > -1) {
          sorted.splice(currentIndex, 1);
          sorted.splice(col.columnIndex, 0, col);
        }
      }
    }

    return getDefaultColumnOrderIds(sorted, enableRowSelection, enableExpanding);
  }, [columns, enableRowSelection, enableExpanding]);

  const [state, setState] = useState<MRT_ColumnOrderState>(
    getSavedState(tableId)?.columnOrder ??
      globalDefaults?.columnOrder ??
      initial
  );

  // If initial state changes (due to plugin column loading, for example) and no
  // custom column order has been saved, update the column order to the new
  // default
  useEffect(() => {
    if (!getSavedState(tableId)?.columnOrder)
      setState(globalDefaults?.columnOrder ?? initial);
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
