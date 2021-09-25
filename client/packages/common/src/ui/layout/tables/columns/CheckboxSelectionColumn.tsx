import React, { useCallback } from 'react';
import { useRegisterActions } from 'kbar';
import { DomainObject } from '../../../../types';
import { Checkbox } from '../../../components/inputs/Checkbox';
import { useTableStore, TableStore } from '../context';
import { ColumnAlign, ColumnDefinition, GenericColumnKey } from './types';

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

export const getCheckboxSelectionColumn = <
  T extends DomainObject
>(): ColumnDefinition<T> => ({
  key: GenericColumnKey.Selection,
  sortable: false,
  align: ColumnAlign.Right,
  width: 40,
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
  Cell: ({ rowData }) => {
    const { isSelected, toggleSelected } = useCheckbox(rowData.id);

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
