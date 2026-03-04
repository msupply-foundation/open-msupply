import { useCallback, useMemo, useState } from 'react';
import {
  MRT_ColumnPinningState,
  MRT_RowData,
  MRT_TableOptions,
} from 'material-react-table';
import { getSavedState, updateSavedState, differentOrUndefined } from './utils';
import { ColumnDef } from '../types';

export const useColumnPinning = <T extends MRT_RowData>(
  tableId: string,
  columns: ColumnDef<T>[],
  rowSelectionEnabled: boolean
) => {
  const initial = useMemo(() => {
    const columnId = (column: ColumnDef<T>): string =>
      column.id ?? column.accessorKey ?? '';

    return {
      left: [
        ...(rowSelectionEnabled ? ['mrt-row-select'] : []),
        ...columns.filter(col => col.pin === 'left').map(columnId),
      ],
      right: columns.filter(col => col.pin === 'right').map(columnId),
    };
  }, []);

  const [state, setState] = useState<MRT_ColumnPinningState>(
    getSavedState(tableId).columnPinning ?? initial
  );

  const [hasSavedState, setHasSavedState] = useState(
    !!getSavedState(tableId).columnPinning
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

        // Ensure "selection" column remains always pinned to the left
        if (
          rowSelectionEnabled &&
          !newColumnPinning.left?.includes('mrt-row-select')
        ) {
          newColumnPinning.left = [
            'mrt-row-select',
            ...(newColumnPinning.left ?? []),
          ];
        }

        const savedColumnPinning = differentOrUndefined(
          newColumnPinning,
          initial
        );
        updateSavedState(tableId, {
          columnPinning: savedColumnPinning,
        });
        if (savedColumnPinning) setHasSavedState(true);
        return newColumnPinning;
      }),
    []
  );

  return {
    initial,
    state,
    update,
    hasSavedState,
    resetHasSavedState: () => setHasSavedState(false),
  };
};
