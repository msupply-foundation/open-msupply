import React from 'react';
import { CellProps } from '../../../columns';
import { BasicTextInput } from '@common/components';
import { RecordWithId } from '@common/types';
import { useBufferState, useDebounceCallback } from '@common/hooks';
import { NumUtils } from 'packages/common/src/utils/NumUtils';

export const NonZeroNumberInputCell = <T extends RecordWithId>({
  rowData,
  column,
  rows,
  rowIndex,
  columnIndex,
}: CellProps<T>): React.ReactElement<CellProps<T>> => {
  const [buffer, setBuffer] = useBufferState(
    column.accessor({ rowData, rows })
  );
  const updater = useDebounceCallback(column.setter, [rowData], 250);

  const autoFocus = rowIndex === 0 && columnIndex === 0;

  return (
    <BasicTextInput
      autoFocus={autoFocus}
      InputProps={{ sx: { '& .MuiInput-input': { textAlign: 'right' } } }}
      type="number"
      value={buffer}
      onChange={e => {
        const newValue = NumUtils.parseString(e.target.value, 1);
        setBuffer(newValue.toString());
        updater({ ...rowData, [column.key]: newValue });
      }}
    />
  );
};
