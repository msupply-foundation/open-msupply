import { useDebouncedValue } from '@common/hooks';
import { isEqual } from 'lodash';
import {
  MRT_DensityState,
  MRT_RowData,
  MRT_TableInstance,
  MRT_TableOptions,
} from 'material-react-table';
import { useEffect } from 'react';

export interface TableLocalStorage {
  density: MRT_DensityState;
  hidden?: string[];
  pinned?: {
    left: string[];
    right: string[];
  };
  columnOrder?: string[];
  columnSizing?: Record<string, number>;
}

/**
 * Hook to save table UI customisations in local storage
 *
 * The associated function `getSavedTableState` (below) is separate from this
 * hook, as it needs be called *before* the table instance is defined.
 */

export const useTableLocalStorage = <T extends MRT_RowData>(
  tableId: string,
  table: MRT_TableInstance<T>
) => {
  const {
    density,
    columnPinning,
    columnSizing,
    columnVisibility,
    columnOrder,
  } = table.getState();

  // Column sizing changes rapidly as column is dragged, so we debounce it to
  // avoid excessive local storage updates
  const debouncedColumnSizing = useDebouncedValue(columnSizing, 1000);

  useEffect(() => {
    const savedString = localStorage.getItem(
      `@openmsupply-client/tables/${tableId}`
    );
    const existingCustomisations = savedString ? JSON.parse(savedString) : {};
    const initial = table.initialState;

    localStorage.setItem(
      `@openmsupply-client/tables/${tableId}`,
      JSON.stringify({
        density,
        columnSizing: debouncedColumnSizing,

        // These can change with different preferences, or versions of OMS
        // We should only save them when the user actually customises something
        hidden: isEqual(columnVisibility, initial.columnVisibility)
          ? existingCustomisations.hidden
          : Object.entries(columnVisibility ?? {})
              .filter(([_, isVisible]) => !isVisible)
              .map(([columnId]) => columnId),
        pinned: isEqual(columnPinning, initial.columnPinning)
          ? existingCustomisations.pinned
          : columnPinning,

        // If defaults are restored, clear any column order customisation
        columnOrder: isEqual(columnOrder, initial.columnOrder)
          ? undefined
          : columnOrder,
      })
    );
  }, [
    density,
    debouncedColumnSizing,
    columnPinning,
    columnVisibility,
    // The column order reference is not stable, so we monitor a stringified
    // version to prevent unnecessary updates
    JSON.stringify(columnOrder),
  ]);
};

export const getSavedTableState = <T extends MRT_RowData>(
  tableId: string,
  defaultHiddenColumns: string[],
  defaultColumnPinning: { left: string[]; right: string[] }
) => {
  const savedString = localStorage.getItem(
    `@openmsupply-client/tables/${tableId}`
  );
  const savedData = savedString ? JSON.parse(savedString) : {};

  const {
    density = 'comfortable',
    hidden = defaultHiddenColumns,
    pinned = defaultColumnPinning,
    columnSizing = {
      columnSizing: {
        'mrt-row-expand': 40,
      },
    },
    columnOrder,
  } = savedData;

  const tableState: MRT_TableOptions<T>['initialState'] = {
    density,
    columnVisibility: Object.fromEntries(
      hidden.map((columnId: string) => [columnId, false])
    ),
    columnPinning: pinned,
    columnSizing,
    columnOrder,
  };

  return tableState;
};

export const resetSavedTableState = (tableId: string) => {
  localStorage.removeItem(`@openmsupply-client/tables/${tableId}`);
};
