import React from 'react';
import { CellProps } from '../../../columns';
import { BasicTextInput } from '@common/components';
import { RecordWithId } from '@common/types';
import { useBufferState, useDebounceCallback } from '@common/hooks';
import { NumUtils } from '@common/utils';

// where NonNegative is n >=0
export const NonNegativeNumberInputCell = <T extends RecordWithId>({
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
    <BasicTextInput
      disabled={isDisabled}
      autoFocus={autoFocus}
      InputProps={{ sx: { '& .MuiInput-input': { textAlign: 'right' } } }}
      type="number"
      value={buffer ?? ''}
      onChange={e => {
        const newValue = NumUtils.parseString(e.target.value);
        setBuffer(newValue.toString());
        updater({ ...rowData, [column.key]: newValue });
      }}
    />
  );
};
