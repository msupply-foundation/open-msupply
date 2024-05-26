import React, { useCallback } from 'react';
import { RecordWithId } from '@common/types';
import { Checkbox } from '@common/components';
import { TableStore, useTableStore } from '../context';
import { ColumnAlign, ColumnDefinition, GenericColumnKey } from './types';

const useCheckbox = (rowId: string) => {
  const selector = useCallback(
    (state: TableStore) => {
      return {
        rowId,
        isSelected: state.rowState[rowId]?.isSelected ?? false,
        toggleSelected: () => state.toggleSelected(rowId),
      };
    },
    [rowId]
  );

  const equalityFn = (
    oldState: ReturnType<typeof selector>,
    newState: ReturnType<typeof selector>
  ) =>
    oldState?.isSelected === newState?.isSelected &&
    oldState.rowId === newState.rowId;

  const { isSelected, toggleSelected } = useTableStore(selector, equalityFn);

  return {
    isSelected,
    toggleSelected,
  };
};

export const getCheckboxSelectionColumn = <
  T extends RecordWithId,
>(): ColumnDefinition<T> => ({
  key: GenericColumnKey.Selection,
  sortable: false,
  align: ColumnAlign.Right,
  width: 60,
  label: 'table.select-unselect-all-columns',
  Header: () => {
    const { toggleAll, allSelected, someSelected } = useTableStore(state => {
      const allSelected =
        state.numberSelected === Object.keys(state.rowState).length;
      return {
        allSelected,
        someSelected: state.numberSelected > 0,
        toggleAll: state.toggleAll,
      };
    });

    return (
      <Checkbox
        size="small"
        checked={!!allSelected}
        indeterminate={someSelected && !allSelected}
        onClick={toggleAll}
      />
    );
  },
  Cell: ({ rowData }) => {
    const { isSelected, toggleSelected } = useCheckbox(rowData.id);

    return (
      <Checkbox
        checked={!!isSelected}
        size="small"
        onClick={event => {
          event.stopPropagation();
          toggleSelected();
        }}
      />
    );
  },
});
