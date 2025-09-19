import { isEqual } from '@common/utils';
import {
  MRT_ColumnOrderState,
  MRT_ColumnPinningState,
  MRT_ColumnSizingState,
  MRT_DensityState,
  MRT_VisibilityState,
} from 'material-react-table';

export interface ManagedTableState {
  density?: MRT_DensityState;
  columnVisibility?: MRT_VisibilityState;
  columnPinning?: MRT_ColumnPinningState;
  columnOrder?: MRT_ColumnOrderState;
  columnSizing?: MRT_ColumnSizingState;
}

export const getSavedState = (tableId: string): ManagedTableState => {
  const savedString = localStorage.getItem(
    `@openmsupply-client/tables/${tableId}`
  );
  const savedData = savedString ? JSON.parse(savedString) : {};

  return savedData;
};

export const updateSavedState = (
  tableId: string,
  newState: ManagedTableState
) => {
  const savedData = getSavedState(tableId);

  localStorage.setItem(
    `@openmsupply-client/tables/${tableId}`,
    JSON.stringify({
      ...savedData,
      ...newState,
    })
  );
};

export const differentOrUndefined = <T>(newValue: T, toCompare: T) =>
  isEqual(newValue, toCompare) ? undefined : newValue;
