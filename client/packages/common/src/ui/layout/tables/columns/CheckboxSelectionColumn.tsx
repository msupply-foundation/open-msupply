import React, { useCallback } from 'react';
import { useRegisterActions } from '@openmsupply-client/common';
import { Checkbox } from '../../../components/inputs/Checkbox';
import { Column } from 'react-table';
import { useTableStore, TableStore } from '../context';

const useCheckbox = (rowId: string) => {
  const selector = useCallback(
    (state: TableStore) => {
      return {
        rowId,
        isSelected: state.rowState[rowId]?.isSelected,
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

  return { isSelected, toggleSelected };
};

export const getCheckboxSelectionColumn = (): Column & {
  key: string;
  sortable: boolean;
} => ({
  key: 'selection',
  sortable: false,
  id: 'selection',
  align: 'right',
  disableSortBy: true,
  width: 40,
  maxWidth: 40,
  minWidth: 40,
  Header: () => {
    const { toggleAll, allSelected, someSelected } = useTableStore(state => {
      useRegisterActions([
        {
          id: 'list-view:toggle-all-rows',
          name: 'List: Toggle all rows',
          shortcut: ['c'],
          keywords: 'list, toggle, rows',
          perform: () => toggleAll(),
        },
      ]);

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
        color="secondary"
        checked={!!allSelected}
        indeterminate={someSelected && !allSelected}
        onClick={toggleAll}
      />
    );
  },
  Cell: ({ row }: { row: { original: { id: string } } }) => {
    const { isSelected, toggleSelected } = useCheckbox(row.original.id);

    return (
      <Checkbox
        checked={!!isSelected}
        color="secondary"
        size="small"
        onClick={event => {
          event.stopPropagation();
          toggleSelected();
        }}
      />
    );
  },
});
