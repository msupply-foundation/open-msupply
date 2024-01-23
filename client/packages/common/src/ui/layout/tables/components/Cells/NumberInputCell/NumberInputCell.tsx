import React from 'react';
import { CellProps } from '../../../columns';
import { NumericTextInput, NumericTextInputProps } from '@common/components';
import { RecordWithId } from '@common/types';
import { useBufferState, useDebounceCallback } from '@common/hooks';

export const NumberInputCell = <T extends RecordWithId>({
  rowData,
  column,
  rowIndex,
  columnIndex,
  isDisabled = false,
  ...props
}: CellProps<T> & NumericTextInputProps): React.ReactElement<CellProps<T>> => {
  const [buffer, setBuffer] = useBufferState(column.accessor({ rowData }));
  const updater = useDebounceCallback(column.setter, [column.setter], 250);

  const autoFocus = rowIndex === 0 && columnIndex === 0;

  return (
    <NumericTextInput
      disabled={isDisabled}
      autoFocus={autoFocus}
      InputProps={{ sx: { '& .MuiInput-input': { textAlign: 'right' } } }}
      type="number"
      value={buffer}
      onChange={num => {
        const newValue = num;
        setBuffer(newValue);
        updater({ ...rowData, [column.key]: Number(newValue) });
      }}
      {...props}
    />
  );
};
