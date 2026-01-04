import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  MRT_VisibilityState,
  MRT_RowData,
  MRT_TableOptions,
} from 'material-react-table';
import { getSavedState, updateSavedState, differentOrUndefined } from './utils';
import { ColumnDef } from '../types';
import { useSimplifiedTabletUI } from '@common/hooks';

export const useColumnVisibility = <T extends MRT_RowData>(
  tableId: string,
  columns: ColumnDef<T>[]
) => {
  const simplifiedMobileView = useSimplifiedTabletUI();

  const initial = useMemo(() => {
    const defaultHiddenColumns = simplifiedMobileView
      ? columns
          .filter(col => col.defaultHideOnMobile)
          .map(c => c.id ?? c.accessorKey ?? '')
      : [];

    return Object.fromEntries(
      defaultHiddenColumns.map((columnId: string) => [columnId, false])
    );
  }, [simplifiedMobileView]);

  const [state, setState] = useState<MRT_VisibilityState>(
    getSavedState(tableId).columnVisibility ?? initial
  );
  const [hasSavedState, setHasSavedState] = useState(
    !!getSavedState(tableId).columnVisibility
  );

  // If initial state changes (due to simplified mobile view turning on/off)
  // And no custom visibility has been saved
  // Update the visibility to the new default
  useEffect(() => {
    if (!getSavedState(tableId).columnVisibility) setState(initial);
  }, [initial]);

  const update = useCallback<
    NonNullable<MRT_TableOptions<MRT_RowData>['onColumnVisibilityChange']>
  >(
    updaterOrValue =>
      setState(prev => {
        const newColumnVisibility =
          typeof updaterOrValue === 'function'
            ? updaterOrValue(prev)
            : updaterOrValue;

        const savedColumnVisibility = differentOrUndefined(
          newColumnVisibility,
          initial
        );
        updateSavedState(tableId, {
          columnVisibility: savedColumnVisibility,
        });
        if (savedColumnVisibility) setHasSavedState(true);
        return newColumnVisibility;
      }),
    [initial]
  );

  return {
    initial,
    state,
    update,
    hasSavedState,
    resetHasSavedState: () => setHasSavedState(false),
  };
};
