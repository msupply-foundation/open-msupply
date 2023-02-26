import React from 'react';
import { CellProps } from '../../../columns';
import { NonNegativeNumberInput } from '@common/components';
import { RecordWithId } from '@common/types';
import { useBufferState, useDebounceCallback } from '@common/hooks';
import { SxProps, Theme } from '@mui/material';

// where NonNegative is n >=0
export const NonNegativeIntegerCell = <T extends RecordWithId>({
  rowData,
  column,
  max,
  isDisabled = false,
  isRequired = false,
  boxSx,
}: CellProps<T> & { max?: number; boxSx?: SxProps<Theme> }): React.ReactElement<
  CellProps<T>
> => {
  const [buffer, setBuffer] = useBufferState(column.accessor({ rowData }));

  const updater = useDebounceCallback(column.setter, [column.setter], 250);

  return (
    <NonNegativeNumberInput
      boxSx={boxSx}
      disabled={isDisabled}
      required={isRequired}
      InputProps={{ sx: { '& .MuiInput-input': { textAlign: 'right' } } }}
      type="number"
      value={buffer}
      onChange={newValue => {
        const intValue = Math.round(newValue);
        if (max && intValue > max) return;
        setBuffer(intValue.toString());
        updater({ ...rowData, [column.key]: intValue });
      }}
    />
  );
};
