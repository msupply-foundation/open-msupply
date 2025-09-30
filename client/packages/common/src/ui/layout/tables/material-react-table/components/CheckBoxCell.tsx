import React from 'react';
import { MRT_Cell, MRT_RowData } from 'material-react-table';
import { Checkbox } from '@common/components';

export const CheckBoxCell = <T extends MRT_RowData>({
  cell,
  disabled,
  updateFn,
}: {
  cell: MRT_Cell<T>;
  disabled?: boolean;
  updateFn: (value: boolean) => void;
}) => {
  const check = cell.getValue<boolean>();

  return (
    <Checkbox
      disabled={disabled}
      checked={check}
      size="small"
      onChange={e => {
        const newValue = e.target.checked;
        updateFn(newValue);
      }}
    />
  );
};
