import React from 'react';
import { MRT_Cell, MRT_RowData } from 'material-react-table';
import { DateUtils, ExpiryDateInput } from '@openmsupply-client/common';

interface ExpiryDateInputCellProps<T extends MRT_RowData> {
  cell: MRT_Cell<T>;
  updateFn: (value: Date | null) => void;
  isDisabled?: boolean;
}

export const ExpiryDateInputCell = <T extends MRT_RowData>({
  cell,
  updateFn,
  isDisabled,
}: ExpiryDateInputCellProps<T>) => {
  const { getValue, column, row } = cell;
  const date = column.accessorFn
    ? // Workaround for tanstack bug:
      (column.accessorFn(row.original, row.index) as Date | null)
    : getValue<Date | null>();
  const value = DateUtils.getDateOrNull(date);

  const onChange = (newValue: Date | null) => {
    updateFn(newValue);
  };

  return (
    <ExpiryDateInput
      value={value}
      onChange={onChange}
      disabled={!!isDisabled}
    />
  );
};
