import React from 'react';
import { CellProps } from '../../../columns';
import { NonNegativeNumberInput } from '@common/components';
import { RecordWithId } from '@common/types';
import { useBufferState, useDebounceCallback } from '@common/hooks';

// where NonNegative is n >=0
export const NonNegativeDecimalCell = <T extends RecordWithId>({
  rowData,
  column,
  isError,
  isDisabled = false,
  max,
}: CellProps<T> & { max?: number }): React.ReactElement<CellProps<T>> => {
  const [buffer, setBuffer] = useBufferState(
    column.accessor({ rowData }) || ''
  );

  const updater = useDebounceCallback(column.setter, [column.setter], 250);

  return (
    <NonNegativeNumberInput
      disabled={isDisabled}
      max={max}
      InputProps={{ sx: { '& .MuiInput-input': { textAlign: 'right' } } }}
      type="number"
      error={isError}
      value={buffer}
      onChange={newValue => {
        const decimal = Math.round(newValue * 100) / 100;
        setBuffer(decimal.toString());
        updater({ ...rowData, [column.key]: decimal });
      }}
    />
  );
};
