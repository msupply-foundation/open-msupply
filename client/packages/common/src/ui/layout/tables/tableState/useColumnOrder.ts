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
import { useGlobalTableDefaults } from './useGlobalTableConfig';

export const useColumnOrder = <T extends MRT_RowData>(
  tableId: string,
  columns: ColumnDef<T>[],
  enableRowSelection: MRT_TableOptions<T>['enableRowSelection'],
  enableExpanding: MRT_TableOptions<T>['enableExpanding']
) => {
  const globalDefaults = useGlobalTableDefaults(tableId);
  const hasRowSelection = !!enableRowSelection;
  const hasExpanding = !!enableExpanding;
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
      enableRowSelection: hasRowSelection, // adds `mrt-row-select`
      enableExpanding: hasExpanding, // adds `mrt-row-expand`
    } as MRT_StatefulTableOptions<MRT_RowData>);
  }, [columns, hasRowSelection, hasExpanding]);

  // Saved/global column orders may have been persisted before
  // `enableExpanding` flipped on (e.g. before the user toggled grouping).
  // Such orders won't contain `mrt-row-expand`, and MRT renders unknown
  // columns at the tail — putting the expand chevron at the END of the
  // table. Splice it in just after `mrt-row-select` so it sits with the
  // other built-in display columns on the left.
  const withExpandColumn = useCallback(
    (order: MRT_ColumnOrderState): MRT_ColumnOrderState => {
      if (!enableExpanding || order.includes('mrt-row-expand')) return order;
      const insertAt = order.indexOf('mrt-row-select');
      const next = [...order];
      next.splice(insertAt === -1 ? 0 : insertAt + 1, 0, 'mrt-row-expand');
      return next;
    },
    [enableExpanding]
  );

  const [state, setState] = useState<MRT_ColumnOrderState>(
    withExpandColumn(
      getSavedState(tableId)?.columnOrder ??
        globalDefaults?.columnOrder ??
        initial
    )
  );

  // If initial state changes (due to plugin column loading, for example) and no
  // custom column order has been saved, update the column order to the new
  // default. globalDefaults?.columnOrder is included so the saved global order
  // applies when preferences load after this hook has already mounted.
  // Also re-runs when `enableExpanding` flips so the saved order gets the
  // expand column spliced in.
  useEffect(() => {
    const saved = getSavedState(tableId)?.columnOrder;
    setState(withExpandColumn(saved ?? globalDefaults?.columnOrder ?? initial));
  }, [initial, globalDefaults?.columnOrder, enableExpanding, withExpandColumn]);

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
