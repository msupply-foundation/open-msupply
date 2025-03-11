import React from 'react';
import { CellProps } from '../../../columns';
import {
  NumericInputProps,
  NumericTextInput,
  StandardTextFieldProps,
} from '@common/components';
import { RecordWithId } from '@common/types';
import { useBufferState, useDebounceCallback } from '@common/hooks';
import { merge } from '@common/utils';

export const NumberInputCell = <T extends RecordWithId>({
  rowData,
  column,
  rowIndex,
  columnIndex,
  isDisabled = false,
  // Make the default min=0 as this is the typical implementation
  // in Data Tables
  min = 0,
  max,
  decimalLimit,
  step,
  multiplier,
  defaultValue,
  allowNegative,
  id,
  TextInputProps,
  width,
  endAdornment,
  error,
  slotProps,
}: CellProps<T> &
  NumericInputProps & {
    id?: string;
    TextInputProps?: StandardTextFieldProps;
    endAdornment?: string;
    error?: boolean;
  } & Pick<StandardTextFieldProps, 'slotProps'>): React.ReactElement<
  CellProps<T>
> => {
  const [buffer, setBuffer] = useBufferState(column.accessor({ rowData }));
  const updater = useDebounceCallback(column.setter, [column.setter], 250);

  const autoFocus = rowIndex === 0 && columnIndex === 0;

  return (
    <NumericTextInput
      id={id}
      disabled={isDisabled}
      autoFocus={autoFocus}
      {...TextInputProps}
      slotProps={merge(
        {
          input: {
            sx: { '& .MuiInput-input': { textAlign: 'right' } },
            ...TextInputProps?.InputProps,
          },
        },
        slotProps
      )}
      onChange={num => {
        const newValue = num === undefined ? min : num;
        if (buffer === newValue) return;
        setBuffer(newValue);
        updater({ ...rowData, [column.key]: Number(newValue) });
      }}
      min={min}
      max={max}
      decimalLimit={decimalLimit}
      step={step}
      multiplier={multiplier}
      allowNegative={allowNegative}
      defaultValue={defaultValue}
      value={buffer as number | undefined}
      width={width}
      endAdornment={endAdornment}
      error={error}
    />
  );
};
