import React from 'react';
import { CellProps } from '../../../columns';
import { PositiveNumberInput } from '@common/components';
import { RecordWithId } from '@common/types';
import { useBufferState, useDebounceCallback } from '@common/hooks';

// where Positive is n > 0
export const PositiveNumberInputCell = <T extends RecordWithId>({
  rowData,
  column,
  rows,
  rowIndex,
  columnIndex,
  isDisabled = false,
}: CellProps<T>): React.ReactElement<CellProps<T>> => {
  const [buffer, setBuffer] = useBufferState(
    column.accessor({ rowData, rows })
  );
  const updater = useDebounceCallback(column.setter, [column.setter], 250);

  const autoFocus = rowIndex === 0 && columnIndex === 0;

  return (
    <PositiveNumberInput
      disabled={isDisabled}
      autoFocus={autoFocus}
      InputProps={{ sx: { '& .MuiInput-input': { textAlign: 'right' } } }}
      type="number"
      value={buffer}
      onChange={newValue => {
        setBuffer(newValue.toString());
        updater({ ...rowData, [column.key]: newValue });
      }}
    />
  );
};
