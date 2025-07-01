import React from 'react';
import { CellProps, ColumnDataSetter } from '../../../columns';
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
  debounce = 250,
}: CellProps<T> &
  NumericInputProps & {
    id?: string;
    TextInputProps?: StandardTextFieldProps;
    endAdornment?: string;
    error?: boolean;
  } & Pick<StandardTextFieldProps, 'slotProps'> & {
    debounce?: number;
  }): React.ReactElement<CellProps<T>> => {
  const [buffer, setBuffer] = useBufferState(column.accessor({ rowData }));
  const updater = useDebounceCallback<ColumnDataSetter<T>>(
    row => {
      const resetValue = column.setter(row);

      // There is a use case, where setter logic could change the value to
      // something other than inputted.
      // E.g. input to issue 6 units, but setter rounds up to 10 (based on pack size).
      // buffer will update, as column.accessor now returns 10.
      // But now I try change the value to 7, and setter rounds up to 10 again.
      // As far as accessor is concerned, the external value hasn't changed (still 10)
      // but buffer is still 7.
      // In this case, can return the correct value from the setter and we
      // force an update here.
      if (resetValue !== undefined) {
        setBuffer(resetValue);
      }
    },
    [column.setter],
    debounce
  );

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
