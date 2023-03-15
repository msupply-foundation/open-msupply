import { useCallback } from 'react';
import { ObjUtils } from '@openmsupply-client/common';
import { useTableStoreWithSelector, TableStore } from '../TableContext';
import { AppSxProp } from '../../../../../styles';

export interface UseRowStyleControl {
  rowId?: string;
  rowStyle: AppSxProp;
  setRowStyle: (id: string, rowStyle: AppSxProp) => void;
  setRowStyles: (ids: string[], rowStyle: AppSxProp) => void;
}

export const useRowStyle = (rowId?: string): UseRowStyleControl => {
  const selector = useCallback(
    (state: TableStore) => {
      return {
        rowId,
        rowStyle: rowId ? state.rowState[rowId]?.style ?? {} : {},
        setRowStyle: (id: string, style: AppSxProp) =>
          state.setRowStyle(id, style),
        setRowStyles: (ids: string[], style: AppSxProp) =>
          state.setRowStyles(ids, style),
      };
    },
    [rowId]
  );

  const equalityFn = (
    oldState: ReturnType<typeof selector>,
    newState: ReturnType<typeof selector>
  ) => ObjUtils.isEqual(oldState.rowStyle, newState.rowStyle);

  return useTableStoreWithSelector(selector, equalityFn);
};
