import { isEqual } from '@common/utils';
import { pickBy } from 'lodash';
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
  isGrouped?: boolean;
}

export const getSavedState = (tableId: string): ManagedTableState => {
  const savedString = localStorage.getItem(
    `@openmsupply-client/tables/${tableId}`
  );

  if (!!savedString) {
    try {
      return JSON.parse(savedString);
    } catch {}
  }

  return {};
};

export const updateSavedState = (
  tableId: string,
  newState: ManagedTableState
) => {
  const savedData = getSavedState(tableId);

  // Remove any keys with undefined values
  const mergedState = pickBy({ ...savedData, ...newState });

  // No change, nothing to do
  if (isEqual(mergedState, savedData)) return;

  // If empty, clear local storage value
  if (isEqual(mergedState, {})) {
    clearSavedState(tableId);
    return;
  }

  localStorage.setItem(
    `@openmsupply-client/tables/${tableId}`,
    JSON.stringify(mergedState)
  );
};

export const clearSavedState = (tableId: string) => {
  localStorage.removeItem(`@openmsupply-client/tables/${tableId}`);
};

export const differentOrUndefined = <T>(newValue: T, toCompare: T) =>
  isEqual(newValue, toCompare) ? undefined : newValue;
