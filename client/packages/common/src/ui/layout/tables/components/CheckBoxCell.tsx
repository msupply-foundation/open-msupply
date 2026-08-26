import React from 'react';
import { MRT_Cell, MRT_RowData } from 'material-react-table';
import { Checkbox } from '@common/components';

export const CheckBoxCell = <T extends MRT_RowData>({
  cell,
  disabled,
  updateFn,
  isError,
}: {
  cell: MRT_Cell<T>;
  disabled?: boolean;
  updateFn: (value: boolean) => void;
  isError?: boolean;
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
      sx={
        isError
          ? {
              border: '2px red solid',
              borderRadius: '8px',
              padding: '8px 7px 6px 8px', // to keep size similar to non-error box
            }
          : undefined
      }
    />
  );
};
