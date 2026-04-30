import { useCallback, useMemo, useState } from 'react';
import {
  MRT_ColumnPinningState,
  MRT_RowData,
  MRT_TableOptions,
} from 'material-react-table';
import { getSavedState, updateSavedState, differentOrUndefined } from './utils';
import { ColumnDef } from '../types';
import { useGlobalTableDefaults } from './useGlobalTableConfig';

export const useColumnPinning = <T extends MRT_RowData>(
  tableId: string,
  columns: ColumnDef<T>[]
) => {
  const globalDefaults = useGlobalTableDefaults(tableId);
  const initial = useMemo(() => {
    const columnId = (column: ColumnDef<T>): string =>
      column.id ?? column.accessorKey ?? '';

    return {
      left: [
        'mrt-row-select',
        'mrt-row-expand',
        ...columns.filter(col => col.pin === 'left').map(columnId),
      ],
      right: columns.filter(col => col.pin === 'right').map(columnId),
    };
  }, []);

  const [state, setState] = useState<MRT_ColumnPinningState>(
    getSavedState(tableId)?.columnPinning ??
      globalDefaults?.columnPinning ??
      initial
  );

  const update = useCallback<
    NonNullable<MRT_TableOptions<MRT_RowData>['onColumnPinningChange']>
  >(
    updaterOrValue =>
      setState(prev => {
        const newColumnPinning =
          typeof updaterOrValue === 'function'
            ? updaterOrValue(prev)
            : updaterOrValue;

        updateSavedState(tableId, {
          columnPinning: differentOrUndefined(newColumnPinning, initial),
        });

        return newColumnPinning;
      }),
    []
  );

  return {
    initial,
    state,
    update,
  };
};
