import React from 'react';
import { CellProps } from '../../../columns';
import { NonNegativeNumberInput } from '@common/components';
import { RecordWithId } from '@common/types';
import { useBufferState, useDebounceCallback } from '@common/hooks';

// where NonNegative is n >=0
export const NonNegativeIntegerCell = <T extends RecordWithId>({
  rowData,
  column,
  isDisabled = false,
  isRequired = false,
}: CellProps<T>): React.ReactElement<CellProps<T>> => {
  const [buffer, setBuffer] = useBufferState(column.accessor({ rowData }));

  const updater = useDebounceCallback(column.setter, [column.setter], 250);

  return (
    <NonNegativeNumberInput
      disabled={isDisabled}
      required={isRequired}
      InputProps={{ sx: { '& .MuiInput-input': { textAlign: 'right' } } }}
      type="number"
      value={buffer}
      onChange={newValue => {
        const intValue = Math.round(newValue);
        setBuffer(intValue.toString());
        updater({ ...rowData, [column.key]: intValue });
      }}
    />
  );
};
