import { useDebouncedValue } from '@common/hooks';
import {
  MRT_DensityState,
  MRT_RowData,
  MRT_TableInstance,
} from 'material-react-table';
import { useEffect, useState } from 'react';

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

const getTableState = (tableId: string): TableLocalStorage => {
  const state = localStorage.getItem(`@openmsupply-client/tables/${tableId}`);
  return state ? JSON.parse(state) : { density: 'compact' };
};

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

  const debouncedColumnSizing = useDebouncedValue(columnSizing, 1000);

  useEffect(() => {
    // console.log('density', density);
    console.log('debouncedColumnSizing', debouncedColumnSizing);
    // console.log('columnPinning', columnPinning);
    // console.log('columnVisibility', columnVisibility);
    console.log('columnOrder', columnOrder);

    const hidden = Object.entries(columnVisibility)
      .filter(([_, isVisible]) => !isVisible)
      .map(([columnId]) => columnId);

    console.log('hidden', hidden);

    localStorage.setItem(
      `@openmsupply-client/tables/${tableId}`,
      JSON.stringify({
        density,
        hidden,
        pinned: columnPinning,
        columnSizing: debouncedColumnSizing,
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

  // const updateTableState = (key: keyof TableLocalStorage, value: any) => {
  //   const newState = { ...tableState, [key]: value };
  //   setTableState(newState);
  //   localStorage.setItem(
  //     `@openmsupply-client/tables/${tableId}`,
  //     JSON.stringify(newState)
  //   );
  // };

  // const resetTableState = () => {
  //   localStorage.removeItem(`@openmsupply-client/tables/${tableId}`);
  // };

  return {
    // tableState,
    // updateTableState,
    // resetTableState,
  };
};
