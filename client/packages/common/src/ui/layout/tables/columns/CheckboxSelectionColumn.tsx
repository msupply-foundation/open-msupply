import React from 'react';
import { Checkbox } from '../../../components/inputs/Checkbox';
import { Column } from 'react-table';

export const getCheckboxSelectionColumn = (): Column & { align: string } => ({
  id: 'selection',
  align: 'right',
  disableSortBy: true,
  Header: ({ getToggleAllRowsSelectedProps }) => (
    <Checkbox
      size="small"
      color="secondary"
      {...getToggleAllRowsSelectedProps()}
    />
  ),
  Cell: ({ row }) => {
    return (
      <Checkbox
        color="secondary"
        size="small"
        onClick={event => {
          event.stopPropagation();
        }}
        {...row.getToggleRowSelectedProps()}
      />
    );
  },
});
